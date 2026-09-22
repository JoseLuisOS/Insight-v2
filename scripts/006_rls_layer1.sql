-- scripts/006_rls_layer1.sql
-- Intersel Insight — RLS layer 1: organization isolation only (spec §22-§23).
-- MUST run via the ADMIN connection: CREATE SCHEMA requires CREATE privilege
-- on the database itself, which intersel_insight_app deliberately doesn't
-- have (NOCREATEDB is about new databases; this is about schemas within the
-- existing one — either way, keep it minimal and let admin create schema
-- `private`, then hand it off). Idempotent (drop-then-create policies,
-- GRANTs are naturally idempotent).

do $$
begin
  begin
    grant intersel_insight_app to postgres;
  exception when duplicate_object or others then null;
  end;
end $$;

create schema if not exists private;
alter schema private owner to intersel_insight_app;
revoke all on schema private from public;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from platform.iam_platform_admins a
    where a.user_id = (select auth.uid())
  );
$$;

create or replace function private.active_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from platform.iam_organization_memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active';
$$;

revoke execute on function private.is_platform_admin() from public, anon;
revoke execute on function private.active_organization_ids() from public, anon;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.active_organization_ids() to authenticated;

-- Schema-level USAGE for authenticated — required before any table grant
-- below can do anything (see Global Constraints: RLS needs GRANT too).
grant usage on schema platform to authenticated;
grant usage on schema intersel_insight to authenticated;

-- ------------------------------------------------------------
-- platform.core_organizations — isolation is "is this MY org", by id.
-- ------------------------------------------------------------
alter table platform.core_organizations enable row level security;
alter table platform.core_organizations no force row level security;
drop policy if exists org_isolation on platform.core_organizations;
create policy org_isolation on platform.core_organizations
  for all to authenticated
  using (private.is_platform_admin() or id in (select private.active_organization_ids()))
  with check (private.is_platform_admin() or id in (select private.active_organization_ids()));
grant select, insert, update, delete on platform.core_organizations to authenticated;

-- ------------------------------------------------------------
-- platform.core_user_profiles — a user sees/edits their own profile only.
-- ------------------------------------------------------------
alter table platform.core_user_profiles enable row level security;
alter table platform.core_user_profiles no force row level security;
drop policy if exists own_profile on platform.core_user_profiles;
create policy own_profile on platform.core_user_profiles
  for all to authenticated
  using (private.is_platform_admin() or user_id = (select auth.uid()))
  with check (private.is_platform_admin() or user_id = (select auth.uid()));
grant select, insert, update, delete on platform.core_user_profiles to authenticated;

-- ------------------------------------------------------------
-- platform.iam_platform_admins — only platform admins can see the admin list;
-- nobody self-service-writes it (no INSERT/UPDATE/DELETE grant here at all).
-- ------------------------------------------------------------
alter table platform.iam_platform_admins enable row level security;
alter table platform.iam_platform_admins no force row level security;
drop policy if exists platform_admins_read on platform.iam_platform_admins;
create policy platform_admins_read on platform.iam_platform_admins
  for select to authenticated
  using (private.is_platform_admin());
grant select on platform.iam_platform_admins to authenticated;

-- ------------------------------------------------------------
-- Directly org-scoped tables: iam_organization_memberships, iam_roles,
-- iam_resources. Same shape every time.
-- ------------------------------------------------------------
do $$
declare v_table text;
begin
  foreach v_table in array array['iam_organization_memberships', 'iam_roles', 'iam_resources'] loop
    execute format('alter table platform.%I enable row level security', v_table);
    execute format('alter table platform.%I no force row level security', v_table);
    execute format('drop policy if exists org_isolation on platform.%I', v_table);
    execute format(
      'create policy org_isolation on platform.%I for all to authenticated ' ||
      'using (private.is_platform_admin() or organization_id in (select private.active_organization_ids())) ' ||
      'with check (private.is_platform_admin() or organization_id in (select private.active_organization_ids()))',
      v_table
    );
    execute format('grant select, insert, update, delete on platform.%I to authenticated', v_table);
  end loop;
end $$;

-- ------------------------------------------------------------
-- iam_membership_roles — org isolation via its membership's org.
-- ------------------------------------------------------------
alter table platform.iam_membership_roles enable row level security;
alter table platform.iam_membership_roles no force row level security;
drop policy if exists org_isolation on platform.iam_membership_roles;
create policy org_isolation on platform.iam_membership_roles
  for all to authenticated
  using (
    private.is_platform_admin()
    or membership_id in (
      select id from platform.iam_organization_memberships
      where organization_id in (select private.active_organization_ids())
    )
  )
  with check (
    private.is_platform_admin()
    or membership_id in (
      select id from platform.iam_organization_memberships
      where organization_id in (select private.active_organization_ids())
    )
  );
grant select, insert, update, delete on platform.iam_membership_roles to authenticated;

-- ------------------------------------------------------------
-- iam_role_permissions — org isolation via its role's org.
-- ------------------------------------------------------------
alter table platform.iam_role_permissions enable row level security;
alter table platform.iam_role_permissions no force row level security;
drop policy if exists org_isolation on platform.iam_role_permissions;
create policy org_isolation on platform.iam_role_permissions
  for all to authenticated
  using (
    private.is_platform_admin()
    or role_id in (select id from platform.iam_roles where organization_id in (select private.active_organization_ids()))
  )
  with check (
    private.is_platform_admin()
    or role_id in (select id from platform.iam_roles where organization_id in (select private.active_organization_ids()))
  );
grant select, insert, update, delete on platform.iam_role_permissions to authenticated;

-- ------------------------------------------------------------
-- iam_user_permission_overrides — org isolation via its membership's org.
-- ------------------------------------------------------------
alter table platform.iam_user_permission_overrides enable row level security;
alter table platform.iam_user_permission_overrides no force row level security;
drop policy if exists org_isolation on platform.iam_user_permission_overrides;
create policy org_isolation on platform.iam_user_permission_overrides
  for all to authenticated
  using (
    private.is_platform_admin()
    or membership_id in (
      select id from platform.iam_organization_memberships
      where organization_id in (select private.active_organization_ids())
    )
  )
  with check (
    private.is_platform_admin()
    or membership_id in (
      select id from platform.iam_organization_memberships
      where organization_id in (select private.active_organization_ids())
    )
  );
grant select, insert, update, delete on platform.iam_user_permission_overrides to authenticated;

-- ------------------------------------------------------------
-- iam_resource_permissions — org isolation via its resource's org.
-- ------------------------------------------------------------
alter table platform.iam_resource_permissions enable row level security;
alter table platform.iam_resource_permissions no force row level security;
drop policy if exists org_isolation on platform.iam_resource_permissions;
create policy org_isolation on platform.iam_resource_permissions
  for all to authenticated
  using (
    private.is_platform_admin()
    or resource_id in (select id from platform.iam_resources where organization_id in (select private.active_organization_ids()))
  )
  with check (
    private.is_platform_admin()
    or resource_id in (select id from platform.iam_resources where organization_id in (select private.active_organization_ids()))
  );
grant select, insert, update, delete on platform.iam_resource_permissions to authenticated;

-- ------------------------------------------------------------
-- iam_modules / iam_permissions — global read-only catalog, any
-- authenticated user can read; writes stay admin-only (no INSERT/UPDATE/
-- DELETE grant to authenticated at all).
-- ------------------------------------------------------------
do $$
declare v_table text;
begin
  foreach v_table in array array['iam_modules', 'iam_permissions'] loop
    execute format('alter table platform.%I enable row level security', v_table);
    execute format('alter table platform.%I no force row level security', v_table);
    execute format('drop policy if exists catalog_read on platform.%I', v_table);
    execute format('create policy catalog_read on platform.%I for select to authenticated using (true)', v_table);
    execute format('grant select on platform.%I to authenticated', v_table);
  end loop;
end $$;

-- ------------------------------------------------------------
-- intersel_insight.survey_* (11 tables) — same org_isolation shape as
-- Task 4's new column. These pre-date this plan and were never granted to
-- authenticated either — fixing that here too.
-- ------------------------------------------------------------
do $$
declare
  v_table text;
  v_tables text[] := array[
    'survey_studies', 'survey_instruments', 'survey_instrument_versions',
    'survey_sections', 'survey_questions', 'survey_variables',
    'survey_answer_options', 'survey_logic_rules', 'survey_observations',
    'survey_responses', 'survey_response_selections'
  ];
begin
  foreach v_table in array v_tables loop
    execute format('alter table intersel_insight.%I enable row level security', v_table);
    execute format('alter table intersel_insight.%I no force row level security', v_table);
    execute format('drop policy if exists org_isolation on intersel_insight.%I', v_table);
    execute format(
      'create policy org_isolation on intersel_insight.%I for all to authenticated ' ||
      'using (private.is_platform_admin() or organization_id in (select private.active_organization_ids())) ' ||
      'with check (private.is_platform_admin() or organization_id in (select private.active_organization_ids()))',
      v_table
    );
    execute format('grant select, insert, update, delete on intersel_insight.%I to authenticated', v_table);
  end loop;
end $$;

select n.nspname as schemaname, c.relname as tablename, c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('platform', 'intersel_insight') and c.relkind = 'r'
order by 1, 2;
