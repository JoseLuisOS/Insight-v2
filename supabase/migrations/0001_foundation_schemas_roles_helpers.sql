-- Intersel Insight — Foundation: schemas, read-only role, RLS helpers, access token hook.
-- See docs/PLAN.md §3, §4, §5. Applied to project kytvxyjvnxamqdrhwezw.

-- ----------------------------------------------------------------------------
-- Schemas
-- ----------------------------------------------------------------------------
-- app:         internal helper functions + auth hook (NOT exposed via API).
-- tenant_data: per-tenant materialized tables (CSV uploads, etc). NOT exposed;
--              only reachable through Edge Functions under the read-only role.
create schema if not exists app;
create schema if not exists tenant_data;

-- ----------------------------------------------------------------------------
-- Dedicated read-only execution role (used by the authenticated query path).
-- NOBYPASSRLS is the crux: tenant isolation applies even to arbitrary SQL.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_readonly') then
    create role app_readonly nologin nosuperuser noinherit nocreatedb nocreaterole nobypassrls;
  end if;
end$$;

grant usage on schema tenant_data to app_readonly;
alter default privileges in schema tenant_data grant select on tables to app_readonly;

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- RLS helper functions — read tenant/role from the JWT claims.
-- ----------------------------------------------------------------------------
create or replace function app.current_claims()
returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

create or replace function app.current_tenant_id()
returns uuid language sql stable as $$
  select nullif(
    coalesce(
      app.current_claims() -> 'app_metadata' ->> 'tenant_id',
      app.current_claims() ->> 'tenant_id'
    ), ''
  )::uuid
$$;

create or replace function app.current_user_role()
returns text language sql stable as $$
  select coalesce(
    app.current_claims() -> 'app_metadata' ->> 'role',
    app.current_claims() ->> 'user_role',
    'viewer'
  )
$$;

create or replace function app.current_can_publish()
returns boolean language sql stable as $$
  select coalesce((app.current_claims() -> 'app_metadata' ->> 'can_publish')::boolean, false)
$$;

grant usage on schema app to anon, authenticated, service_role;
grant execute on function app.current_claims(), app.current_tenant_id(),
                         app.current_user_role(), app.current_can_publish()
  to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Custom access token hook: injects tenant_id / role / can_publish into the JWT
-- app_metadata, read from public.profiles.
-- MUST be enabled in Supabase Auth (Authentication > Hooks > Customize Access
-- Token) pointing to app.custom_access_token_hook.
-- ----------------------------------------------------------------------------
create or replace function app.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb;
  v_tenant uuid;
  v_role text;
  v_can_publish boolean;
begin
  select p.tenant_id, p.role, p.can_publish
    into v_tenant, v_role, v_can_publish
  from public.profiles p
  where p.id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  if not (claims ? 'app_metadata') or jsonb_typeof(claims -> 'app_metadata') <> 'object' then
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb, true);
  end if;

  if v_tenant is not null then
    claims := jsonb_set(claims, '{app_metadata,tenant_id}', to_jsonb(v_tenant::text), true);
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(coalesce(v_role, 'viewer')), true);
    claims := jsonb_set(claims, '{app_metadata,can_publish}', to_jsonb(coalesce(v_can_publish, false)), true);
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema app to supabase_auth_admin;
grant execute on function app.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- ----------------------------------------------------------------------------
-- Pin search_path on all functions (prevents search_path hijacking).
-- ----------------------------------------------------------------------------
alter function app.set_updated_at()                set search_path = '';
alter function app.current_claims()                set search_path = '';
alter function app.current_tenant_id()             set search_path = '';
alter function app.current_user_role()             set search_path = '';
alter function app.current_can_publish()           set search_path = '';
alter function app.custom_access_token_hook(jsonb) set search_path = '';
