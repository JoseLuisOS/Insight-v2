-- Insight-v2: separate owned data by domain without touching Supabase auth.
-- One-time migration. Run with: node scripts/run-sql.js scripts/011_reorganize_schemas.sql --admin
-- All DDL and checks share a transaction. A failed check rolls everything back.

begin;
set local lock_timeout = '10s';
set local statement_timeout = '90s';
set local search_path = pg_catalog, pg_temp;

do $$
begin
  if to_regnamespace('platform') is null or to_regnamespace('intersel_insight') is null then
    raise exception 'Expected source schemas platform and intersel_insight';
  end if;
  if to_regnamespace('insight_core') is not null
     or to_regnamespace('insight_iam') is not null
     or to_regnamespace('insight_survey') is not null then
    raise exception 'Target schema already exists; inspect before rerunning';
  end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'platform' and c.relkind in ('r','p')) <> 12
     or (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'intersel_insight' and c.relkind in ('r','p')) <> 11 then
    raise exception 'Unexpected source table count';
  end if;
end $$;

create temporary table insight_schema_snapshot (
  table_oid oid primary key,
  old_schema text not null,
  table_name text not null,
  owner_oid oid not null,
  rls boolean not null,
  force_rls boolean not null,
  policy_count integer not null,
  row_count bigint not null
) on commit drop;

do $$
declare r record; v_count bigint;
begin
  for r in
    select c.oid, n.nspname as schema_name, c.relname as table_name,
           c.relowner, c.relrowsecurity, c.relforcerowsecurity,
           (select count(*)::int from pg_policy p where p.polrelid = c.oid) as policies
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('platform','intersel_insight') and c.relkind in ('r','p')
  loop
    execute format('select count(*) from %I.%I', r.schema_name, r.table_name) into v_count;
    insert into insight_schema_snapshot values
      (r.oid, r.schema_name, r.table_name, r.relowner,
       r.relrowsecurity, r.relforcerowsecurity, r.policies, v_count);
  end loop;
end $$;

create schema insight_core authorization insight_app;
create schema insight_iam authorization insight_app;
alter schema intersel_insight rename to insight_survey;

alter table platform.core_organizations set schema insight_core;
alter table platform.core_user_profiles set schema insight_core;

do $$
declare r record;
begin
  for r in select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'platform' and c.relkind in ('r','p')
           order by relname
  loop
    if r.relname !~ '^iam_' then
      raise exception 'Unexpected non-IAM table left in platform: %', r.relname;
    end if;
    execute format('alter table platform.%I set schema insight_iam', r.relname);
  end loop;
end $$;

-- Preserve the invoker access used by public.get_my_profile and RLS helpers.
grant usage on schema insight_core, insight_iam, insight_survey, private to authenticated;

-- SQL and PL/pgSQL string bodies keep their old qualified names after a move.
-- Recreate only affected private/public functions; signatures, owners, grants,
-- SECURITY DEFINER/INVOKER and search_path remain as pg_get_functiondef reports.
do $$
declare r record; v_definition text;
begin
  for r in
    select p.oid, n.nspname, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('private','public') and p.prokind = 'f'
      and pg_get_functiondef(p.oid) like '%platform.%'
    order by n.nspname, p.proname
  loop
    v_definition := pg_get_functiondef(r.oid);
    v_definition := replace(v_definition, 'platform.core_', 'insight_core.core_');
    v_definition := replace(v_definition, 'platform.iam_', 'insight_iam.iam_');
    if v_definition like '%platform.%' then
      raise exception 'Unmapped platform reference in %.%', r.nspname, r.proname;
    end if;
    execute v_definition;
  end loop;
end $$;

-- Empty legacy schemas can leave misleading paths or accidental new objects.
drop schema platform restrict;
drop schema survey restrict;

do $$
declare r record; v_count bigint; v_expected_schema text;
begin
  for r in select * from insight_schema_snapshot loop
    v_expected_schema := case
      when r.old_schema = 'intersel_insight' then 'insight_survey'
      when r.table_name like 'core_%' then 'insight_core'
      else 'insight_iam' end;

    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where c.oid = r.table_oid and n.nspname = v_expected_schema
        and c.relname = r.table_name and c.relowner = r.owner_oid
        and c.relrowsecurity = r.rls and c.relforcerowsecurity = r.force_rls
        and (select count(*)::int from pg_policy p where p.polrelid = c.oid) = r.policy_count
    ) then
      raise exception 'Table metadata changed unexpectedly: %', r.table_name;
    end if;
    execute format('select count(*) from %I.%I', v_expected_schema, r.table_name) into v_count;
    if v_count <> r.row_count then
      raise exception 'Row count changed unexpectedly: %', r.table_name;
    end if;
  end loop;

  if (select count(*) from insight_schema_snapshot) <> 23 then
    raise exception 'Expected 23 migrated tables';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public','private') and p.prokind = 'f'
      and (pg_get_functiondef(p.oid) like '%platform.%'
           or pg_get_functiondef(p.oid) like '%intersel_insight.%')
  ) then
    raise exception 'A public/private function still references an old schema';
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
