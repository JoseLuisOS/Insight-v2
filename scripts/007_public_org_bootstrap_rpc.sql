-- scripts/007_public_org_bootstrap_rpc.sql
-- Insight-v2 — public-schema RPC shims over insight_core and insight_iam.
--
-- Why this exists: the Supabase Data API exposes `public`, while the three
-- insight_* schemas are private to the Data API. The Next.js app talks to Postgres
-- through supabase-js/PostgREST, so until that's changed, anything the
-- frontend needs from those schemas has to go through a `public`-schema
-- function it CAN call. These two are SECURITY DEFINER, callable only by
-- `authenticated`, and never return more than the specific fields needed.
--
-- MUST run via the ADMIN connection: insight_app doesn't own
-- schema `public` (Supabase's default owner there is `postgres`) and has
-- no CREATE privilege on it, only on the application-owned schemas.

set search_path = insight_survey, insight_core, insight_iam, public;

do $$
begin
  begin
    grant insight_app to postgres;
  exception when duplicate_object or others then null;
  end;
end $$;

-- Organizations are admin-assigned, never self-service (see
-- ARQUITECTURA_BBDD.md §2 "usuario ≠ miembro de organización" and the
-- product decision recorded in docs/LOG.md 2026-09-22). This function is
-- what src/app/(app)/layout.tsx calls to decide whether to route a fresh
-- login to /onboarding (only when the installation has literally zero
-- organizations yet, and only for a platform admin) or straight into the
-- app.
create or replace function public.get_org_bootstrap_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'is_platform_admin', exists (
      select 1 from insight_iam.iam_platform_admins a where a.user_id = (select auth.uid())
    ),
    'organization_count', (select count(*) from insight_core.core_organizations)
  );
$$;

revoke execute on function public.get_org_bootstrap_status() from public, anon;
grant execute on function public.get_org_bootstrap_status() to authenticated;

-- Creates the installation's first organization. Enforces its own rule
-- (not just a UI-level check): only a platform admin, and only when none
-- exist yet. Seeds the same 5 preset roles as scripts/004_iam_seed_hcv.sql
-- and makes the caller its Owner. A general "create additional
-- organizations" manager is future work (see docs/LOG.md) — this is
-- deliberately just the one-time bootstrap path.
create or replace function public.bootstrap_first_organization(p_name text, p_timezone text default 'America/Hermosillo')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org_id uuid;
  v_slug text;
  v_membership_id uuid;
  v_role record;
  v_role_id uuid;
begin
  if not exists (select 1 from insight_iam.iam_platform_admins a where a.user_id = v_uid) then
    raise exception 'Solo el sysadmin puede crear la organización inicial.';
  end if;

  if exists (select 1 from insight_core.core_organizations) then
    raise exception 'Ya existe al menos una organización — usa el gestor de organizaciones (próximamente).';
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then
    raise exception 'Nombre de organización inválido.';
  end if;

  insert into insight_core.core_organizations (name, slug, timezone)
  values (p_name, v_slug, coalesce(p_timezone, 'America/Hermosillo'))
  returning id into v_org_id;

  insert into insight_iam.iam_organization_memberships (organization_id, user_id, status, joined_at)
  values (v_org_id, v_uid, 'active', now())
  returning id into v_membership_id;

  for v_role in
    select * from (values
      ('owner', 'Owner'), ('administrator', 'Administrator'),
      ('analyst', 'Analyst'), ('operator', 'Operator'), ('viewer', 'Viewer')
    ) as r(code, name)
  loop
    insert into insight_iam.iam_roles (organization_id, code, name, is_system, is_editable)
    values (v_org_id, v_role.code, v_role.name, true, false)
    returning id into v_role_id;

    if v_role.code = 'owner' then
      insert into insight_iam.iam_membership_roles (membership_id, role_id)
      values (v_membership_id, v_role_id);

      insert into insight_iam.iam_role_permissions (role_id, permission_id)
      select v_role_id, p.id from insight_iam.iam_permissions p;
    end if;
  end loop;

  return v_org_id;
end;
$$;

revoke execute on function public.bootstrap_first_organization(text, text) from public, anon;
grant execute on function public.bootstrap_first_organization(text, text) to authenticated;

-- Deliberately left owned by postgres/pg_database_owner: insight_app
-- has no CREATE on schema public (only postgres does — confirmed the hard
-- way, ALTER ... OWNER TO requires the new owner to have CREATE on the
-- target schema), so it can't take ownership here. Future edits to these
-- two functions run via the admin connection, same as creating them.
