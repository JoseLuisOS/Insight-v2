-- Épica SQL: secure read-only execution of user SQL.
-- run_query is SECURITY INVOKER and switches into the app_readonly role
-- (SELECT-only + NOBYPASSRLS) for the query, then restores the caller's role.
-- Tenant isolation holds; writes are denied; single-statement + timeout + row cap.
--
-- (On the cloud project this was reached through a few iterations; this file is
--  the consolidated final state, safe to run on a fresh database.)

-- authenticated must be a member of app_readonly to SET ROLE into it.
grant app_readonly to authenticated;

-- app_readonly needs to evaluate the tenant RLS helper.
grant usage on schema app to app_readonly;
grant execute on function app.current_claims(), app.current_tenant_id() to app_readonly;

-- Materialized dataset tables must be readable by app_readonly under RLS, so the
-- ingest policy/grants now target app_readonly as well.
create or replace function public.ingest_dataset(p_name text, p_columns jsonb, p_rows jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid := app.current_tenant_id();
  v_dataset uuid := gen_random_uuid();
  v_tbl text := 'ds_' || replace(v_dataset::text, '-', '');
  v_col jsonb;
  v_key text;
  v_type text;
  v_coldefs text := '';
  v_collist text := '';
  v_vallist text := '';
  v_count int := 0;
  v_allowed text[] := array['text','integer','numeric','boolean','date','timestamptz'];
begin
  if v_uid is null or v_tenant is null then
    raise exception 'not authenticated or no tenant';
  end if;
  if p_columns is null or jsonb_array_length(p_columns) = 0 then
    raise exception 'no columns provided';
  end if;

  for v_col in select * from jsonb_array_elements(p_columns) loop
    v_key := v_col ->> 'key';
    v_type := lower(coalesce(v_col ->> 'type', ''));
    if v_key is null or v_key = '' then raise exception 'column key missing'; end if;
    if lower(v_key) = 'tenant_id' then raise exception 'reserved column name: tenant_id'; end if;
    if not (v_type = any(v_allowed)) then raise exception 'invalid column type: %', v_type; end if;
    v_coldefs := v_coldefs || format(', %I %s', v_key, v_type);
    v_collist := v_collist || format(', %I', v_key);
    v_vallist := v_vallist || format(', nullif(r->>%L, '''')::%s', v_key, v_type);
  end loop;

  execute format('create table tenant_data.%I (tenant_id uuid not null default %L%s)',
                 v_tbl, v_tenant, v_coldefs);
  execute format('alter table tenant_data.%I enable row level security', v_tbl);
  execute format('create policy tenant_isolation on tenant_data.%I for all to authenticated, app_readonly '
              || 'using (tenant_id = app.current_tenant_id()) '
              || 'with check (tenant_id = app.current_tenant_id())', v_tbl);
  execute format('grant select on tenant_data.%I to authenticated, app_readonly', v_tbl);
  execute format('create index on tenant_data.%I (tenant_id)', v_tbl);

  if p_rows is not null and jsonb_array_length(p_rows) > 0 then
    execute format('insert into tenant_data.%I (tenant_id%s) '
                || 'select %L::uuid%s from jsonb_array_elements($1) as r',
                v_tbl, v_collist, v_tenant, v_vallist) using p_rows;
    v_count := jsonb_array_length(p_rows);
  end if;

  insert into public.datasets (id, tenant_id, name, kind, physical_table, columns_json, row_count, created_by)
  values (v_dataset, v_tenant, coalesce(nullif(trim(p_name), ''), 'Dataset'),
          'csv_materialized', 'tenant_data.' || v_tbl, p_columns, v_count, v_uid);

  return v_dataset;
end;
$$;
revoke all on function public.ingest_dataset(text, jsonb, jsonb) from public;
grant execute on function public.ingest_dataset(text, jsonb, jsonb) to authenticated;

create or replace function public.run_query(p_sql text, p_limit int default 1000)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := app.current_tenant_id();
  v_result jsonb;
  v_limit int := greatest(1, least(coalesce(p_limit, 1000), 5000));
  v_clean text := btrim(regexp_replace(coalesce(p_sql, ''), ';\s*$', ''));
  v_prev text := current_user;
begin
  if v_tenant is null then raise exception 'no tenant'; end if;
  if v_clean = '' then raise exception 'empty query'; end if;
  if position(';' in v_clean) > 0 then
    raise exception 'only a single statement is allowed';
  end if;

  set local role app_readonly;
  set local statement_timeout = '8s';

  begin
    execute format(
      'select coalesce(jsonb_agg(t), ''[]''::jsonb) from (select * from (%s) _q limit %s) t',
      v_clean, v_limit
    ) into v_result;
  exception when others then
    execute format('set local role %I', v_prev);
    raise;
  end;

  execute format('set local role %I', v_prev);
  return v_result;
end;
$$;
revoke all on function public.run_query(text, int) from public;
grant execute on function public.run_query(text, int) to authenticated;
