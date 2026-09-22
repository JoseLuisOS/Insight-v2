-- scripts/003_platform_iam_foundation.sql
-- Intersel Insight — platform schema: IAM foundation (multi-organization).
-- Source: ARQUITECTURA_BBDD.md §3-§15.
-- MUST run via the ADMIN connection (CENTRAL_DATABASE_URL): three tables FK
-- to auth.users, and intersel_insight_app has no USAGE on schema auth
-- (docs/ARQUITECTURA.md §1, "Limitación conocida"). Idempotent (safe to re-run).

-- Defensive: make sure postgres can reassign ownership to intersel_insight_app.
do $$
begin
  begin
    grant intersel_insight_app to postgres;
  exception when duplicate_object or others then null;
  end;
end $$;

create schema if not exists platform;
set search_path = platform, public;

-- 1. core_organizations — el tenant lógico.
create table if not exists platform.core_organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    status text not null default 'active'
        check (status in ('active','inactive','suspended','archived')),
    timezone text not null default 'America/Hermosillo',
    settings jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. core_user_profiles — 1:1 con auth.users.
create table if not exists platform.core_user_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    avatar_url text,
    status text not null default 'active' check (status in ('active','disabled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. iam_platform_admins — sysadmin, gobierna la instalación completa.
create table if not exists platform.iam_platform_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role text not null check (role in ('sysadmin')),
    created_at timestamptz not null default now()
);

-- 4. iam_organization_memberships — usuario != miembro; esto los conecta.
create table if not exists platform.iam_organization_memberships (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references platform.core_organizations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'active'
        check (status in ('invited','active','suspended','revoked')),
    joined_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (organization_id, user_id)
);
create index if not exists idx_iam_org_memberships_org on platform.iam_organization_memberships (organization_id);
create index if not exists idx_iam_org_memberships_user on platform.iam_organization_memberships (user_id);

-- 5. iam_roles — por organización; Owner/Admin/etc. son presets, no arquitectura.
create table if not exists platform.iam_roles (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references platform.core_organizations(id) on delete cascade,
    code text not null,
    name text not null,
    description text,
    is_system boolean not null default false,
    is_editable boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (organization_id, code)
);
create index if not exists idx_iam_roles_org on platform.iam_roles (organization_id);

-- 6. iam_membership_roles — un membership puede tener varios roles.
create table if not exists platform.iam_membership_roles (
    membership_id uuid not null references platform.iam_organization_memberships(id) on delete cascade,
    role_id uuid not null references platform.iam_roles(id) on delete cascade,
    primary key (membership_id, role_id)
);

-- 7. iam_modules — catálogo de módulos de la plataforma.
create table if not exists platform.iam_modules (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    description text,
    active boolean not null default true,
    sort_order integer not null default 0
);

-- 8. iam_permissions — permisos atómicos (survey.view, survey.export, ...).
create table if not exists platform.iam_permissions (
    id uuid primary key default gen_random_uuid(),
    module_id uuid not null references platform.iam_modules(id),
    code text not null unique,
    action text not null,
    description text,
    supports_resource_scope boolean not null default false
);
create index if not exists idx_iam_permissions_module on platform.iam_permissions (module_id);

-- 9. iam_role_permissions — los roles solo otorgan (acumulativo, sin DENY).
create table if not exists platform.iam_role_permissions (
    role_id uuid not null references platform.iam_roles(id) on delete cascade,
    permission_id uuid not null references platform.iam_permissions(id) on delete cascade,
    primary key (role_id, permission_id)
);

-- 10. iam_user_permission_overrides — excepción individual, por membership.
create table if not exists platform.iam_user_permission_overrides (
    id uuid primary key default gen_random_uuid(),
    membership_id uuid not null references platform.iam_organization_memberships(id) on delete cascade,
    permission_id uuid not null references platform.iam_permissions(id) on delete cascade,
    effect text not null check (effect in ('allow','deny')),
    reason text,
    created_at timestamptz not null default now(),
    unique (membership_id, permission_id)
);

-- 11. iam_resources — recursos individuales con posible ACL fina.
create table if not exists platform.iam_resources (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references platform.core_organizations(id) on delete cascade,
    resource_type text not null,
    domain_resource_id text not null,
    access_mode text not null default 'organization'
        check (access_mode in ('organization','restricted')),
    created_at timestamptz not null default now(),
    unique (organization_id, resource_type, domain_resource_id)
);
create index if not exists idx_iam_resources_org on platform.iam_resources (organization_id);

-- 12. iam_resource_permissions — ACL sobre un recurso puntual.
create table if not exists platform.iam_resource_permissions (
    id uuid primary key default gen_random_uuid(),
    resource_id uuid not null references platform.iam_resources(id) on delete cascade,
    membership_id uuid references platform.iam_organization_memberships(id) on delete cascade,
    role_id uuid references platform.iam_roles(id) on delete cascade,
    permission_id uuid not null references platform.iam_permissions(id) on delete cascade,
    effect text not null check (effect in ('allow','deny')),
    check (
        (membership_id is not null and role_id is null)
        or (membership_id is null and role_id is not null)
    )
);
create index if not exists idx_iam_resource_permissions_resource on platform.iam_resource_permissions (resource_id);

-- Ownership: schema + everything just created, to the app's master role.
alter schema platform owner to intersel_insight_app;
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'platform' loop
    execute format('alter table platform.%I owner to intersel_insight_app', r.tablename);
  end loop;
end $$;

select tablename, tableowner from pg_tables where schemaname = 'platform' order by 1;
