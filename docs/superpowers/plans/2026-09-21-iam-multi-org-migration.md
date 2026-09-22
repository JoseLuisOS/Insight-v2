# IAM Multi-Organization Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the multi-organization IAM foundation (`platform` schema: `core_*`/`iam_*` tables, roles/permissions, RLS-enforced org isolation) to the live database, and integrate the existing `survey_*` domain (schema `intersel_insight`) under it, without disturbing `survey_*`'s existing data.

**Architecture:** Follow `ARQUITECTURA_BBDD.md` §3–§21 literally (table shapes, RBAC model, resource ACL), with one deliberate deviation from a flat single-schema layout: platform administration (`core_*`/`iam_*`) lives in its own Postgres schema, **`platform`**, separate from the business-domain schema `intersel_insight` (which keeps `survey_*` and future `analytics_*`/`dashboard_*`/etc.). Same database, same master role owns both schemas today — the split is organizational now and becomes a real privilege boundary later if a narrower role is introduced (see Task 2's note). DDL that FKs to `auth.users` runs via the admin connection (`CENTRAL_DATABASE_URL`), then ownership of new objects is transferred to the app's master role `intersel_insight_app` — the same pattern already used for `survey_*` (see `docs/ARQUITECTURA.md` §1). RLS enforces **organization isolation only** (per spec §23); permission-level authorization (`iam_role_permissions`, overrides) stays an application-layer concern for this phase.

**Tech Stack:** PostgreSQL 17 (Supabase project `bkeiyculoypaisbpjvln`), plain `.sql` scripts run with `node` + `pg` (no Supabase CLI / MCP access to this project — see `.claude/skills/insight-v2/SKILL.md`).

**Spec:** [`ARQUITECTURA_BBDD.md`](../../../ARQUITECTURA_BBDD.md) (repo root) — sections §3–§21 (tables), §22–§23 (RLS vs. authorization split).

## Global Constraints

- Two Postgres schemas, one database: **`platform`** (`core_*`/`iam_*` — new, this plan) and **`intersel_insight`** (`survey_*` — existing, untouched except for the added `organization_id` column). Plus **`private`** (RLS helper functions only, not exposed to the Data API).
- Every new table with an FK to `auth.users` is created via `CENTRAL_DATABASE_URL` (admin); everything else via `APP_DATABASE_URL` (`intersel_insight_app`) wherever possible.
- RLS policy functions wrap `auth.uid()` in `(select auth.uid())` and live in `security definer` functions under schema `private`, `set search_path = ''`, fully-qualified table names inside, `execute` revoked from `public`/`anon`, granted only to `authenticated` — per `security-rls-performance.md`.
- **Every `to authenticated` RLS policy needs a matching object-level `GRANT`** (`USAGE` on the schema + `SELECT`/`INSERT`/`UPDATE`/`DELETE` on the table as applicable) — RLS only filters rows, it doesn't substitute for the base privilege. This applies to `platform.*` (new) and to `intersel_insight.survey_*` (pre-existing tables likely never granted to `authenticated` either — verify in Task 5).
- RLS = organization isolation only for this phase (spec §23). No table gets deleted or loses data. All migrations are additive/idempotent (`on conflict do nothing`, `if not exists` where applicable) so they're safe to re-run.
- Naming continues the existing convention in `scripts/` (`NNN_description.sql`, snake_case), started by the already-delivered `scripts/001_initial_base_survey.sql` / `scripts/002_carga_survey_test.sql`. Do **not** use `supabase/migrations/` — that tree targets the abandoned tenant architecture (see `docs/ARQUITECTURA.md` §1).
- Platform "god mode" sysadmin bootstrap target: **`joseluis.o.santana@hotmail.com`** (not the developer running this plan).
- Git commits: only run `git commit` once the user has approved executing this plan (they have, as of 2026-09-21) — commit after each task as usual.

---

### Task 1: Shared SQL runner + `pg` devDependency

**Files:**
- Create: `scripts/run-sql.js`
- Modify: `package.json` (add `pg` devDependency)
- Test: manual run against a trivial query (Step 3 below)

**Interfaces:**
- Produces: `node scripts/run-sql.js <path/to/file.sql> [--app]` — default connects with `CENTRAL_DATABASE_URL` (admin), `--app` connects with `APP_DATABASE_URL` (`intersel_insight_app`). Every later task's "run it" step uses this.

- [ ] **Step 1: Install `pg` as a devDependency**

```bash
npm install --save-dev pg
```

- [ ] **Step 2: Write the runner**

```javascript
// scripts/run-sql.js
// Runs a .sql file against the Insight-v2 database.
// Usage: node scripts/run-sql.js <path/to/file.sql> [--app]
//   (default) admin connection (CENTRAL_DATABASE_URL) — required for DDL
//   that references auth.users (see docs/ARQUITECTURA.md §1).
//   --app      app connection (APP_DATABASE_URL, role intersel_insight_app)
//   — use for anything that doesn't touch auth.users.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

process.loadEnvFile(path.resolve(__dirname, '..', '.env'));

const file = process.argv[2];
const useApp = process.argv.includes('--app');

if (!file) {
  console.error('Usage: node scripts/run-sql.js <path/to/file.sql> [--app]');
  process.exit(1);
}

const connStr = useApp ? process.env.APP_DATABASE_URL : process.env.CENTRAL_DATABASE_URL;
if (!connStr) {
  console.error(`Missing ${useApp ? 'APP_DATABASE_URL' : 'CENTRAL_DATABASE_URL'} in .env`);
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf8');

(async () => {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(sql);
    const results = Array.isArray(result) ? result : [result];
    for (const r of results) {
      if (r && r.rows && r.rows.length) console.table(r.rows);
    }
    console.log(`OK: ${file} (as ${useApp ? 'intersel_insight_app' : 'postgres'})`);
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(`FAILED: ${file}\n${e.message}`);
  process.exit(1);
});
```

- [ ] **Step 3: Smoke-test it**

Create a scratch file `scripts/_smoke.sql` with just `select current_user, now();`, then:

```bash
node scripts/run-sql.js scripts/_smoke.sql
node scripts/run-sql.js scripts/_smoke.sql --app
```

Expected: first prints `current_user: postgres`, second prints `current_user: intersel_insight_app`, both followed by `OK: ...`. Delete `scripts/_smoke.sql` afterward.

- [ ] **Step 4: Commit**

```bash
git add scripts/run-sql.js package.json package-lock.json
git commit -m "chore: add SQL runner script for db-check migrations"
```

---

### Task 2: `platform` schema — core + IAM DDL

**Files:**
- Create: `scripts/003_platform_iam_foundation.sql`
- Test: run via Task 1's runner (Step 2/3 below)

**Interfaces:**
- Consumes: `intersel_insight_app` role (already exists live).
- Produces: schema `platform`, owned by `intersel_insight_app`, containing `core_organizations`, `core_user_profiles`, `iam_platform_admins`, `iam_organization_memberships`, `iam_roles`, `iam_membership_roles`, `iam_modules`, `iam_permissions`, `iam_role_permissions`, `iam_user_permission_overrides`, `iam_resources`, `iam_resource_permissions`. Task 3, Task 4 and Task 5 all reference these as `platform.<table>`.

**Why a separate schema (and why it's safe to do now):** these 12 tables don't exist yet anywhere — moving them later, once they hold real membership/role data, would be a much bigger migration. `survey_*` already has production rows, so it stays in `intersel_insight` rather than being moved. Today both schemas are owned by the same role (`intersel_insight_app`), so the split has no access-control effect yet; it pays off the day a narrower role (e.g. a future sandboxed query-exec role per `docs/PLAN.md` §5.2) should be able to read `intersel_insight` but never touch `platform`.

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Run it (admin connection — has FKs to auth.users)**

```bash
node scripts/run-sql.js scripts/003_platform_iam_foundation.sql
```

Expected: table of 12 rows, all with `tableowner = intersel_insight_app`, then `OK: ...`.

- [ ] **Step 3: Verify idempotency**

```bash
node scripts/run-sql.js scripts/003_platform_iam_foundation.sql
```

Expected: same output, no errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/003_platform_iam_foundation.sql
git commit -m "feat(db): add platform schema with core/iam multi-organization tables"
```

---

### Task 3: IAM seed data (organización HCV + catálogo + sysadmin)

**Files:**
- Create: `scripts/004_iam_seed_hcv.sql`
- Test: run via runner + a verification query (Step 3)

**Interfaces:**
- Consumes: tables from Task 2 (`platform.core_organizations`, `platform.iam_modules`, `platform.iam_permissions`, `platform.iam_roles`, `platform.iam_role_permissions`, `platform.iam_platform_admins`, `platform.core_user_profiles`, `platform.iam_organization_memberships`, `platform.iam_membership_roles`).
- Produces: one organization (`slug = 'hermosillo-como-vamos'`), 6 modules, 24 permissions, 5 roles for that org with permissions assigned, `joseluis.o.santana@hotmail.com` as `sysadmin` (platform "god mode") + `Owner` member of that org if that `auth.users` row already exists. Task 4/5 reference the org by slug the same way.

- [ ] **Step 1: Write the seed script**

```sql
-- scripts/004_iam_seed_hcv.sql
-- Intersel Insight — IAM seed data (organización HCV + catálogo).
-- MUST run via the ADMIN connection: bootstraps iam_platform_admins, which
-- FKs to auth.users. Idempotent (on conflict do nothing throughout).

set search_path = platform, public;

-- 1. Organización inicial.
insert into platform.core_organizations (id, name, slug, timezone)
values ('00000000-0000-0000-0000-000000000001', 'Hermosillo ¿Cómo Vamos?', 'hermosillo-como-vamos', 'America/Hermosillo')
on conflict (slug) do nothing;

-- 2. Catálogo de módulos.
insert into platform.iam_modules (code, name, sort_order) values
  ('organization', 'Organización', 10),
  ('members',      'Miembros',     20),
  ('roles',        'Roles',        30),
  ('survey',       'Encuestas',    40),
  ('analytics',    'Análisis',     50),
  ('dashboard',    'Dashboards',   60)
on conflict (code) do nothing;

-- 3. Catálogo de permisos.
insert into platform.iam_permissions (module_id, code, action, supports_resource_scope)
select m.id, p.code, p.action, p.resource_scope
from (values
  ('organization', 'organization.view',   'view',   false),
  ('organization', 'organization.update', 'update', false),
  ('members',      'members.view',        'view',   false),
  ('members',      'members.invite',      'invite', false),
  ('members',      'members.update',      'update', false),
  ('members',      'members.remove',      'remove', false),
  ('roles',        'roles.view',          'view',   false),
  ('roles',        'roles.create',        'create', false),
  ('roles',        'roles.update',        'update', false),
  ('roles',        'roles.delete',        'delete', false),
  ('survey',       'survey.access',       'access', true),
  ('survey',       'survey.view',         'view',   true),
  ('survey',       'survey.create',       'create', false),
  ('survey',       'survey.update',       'update', true),
  ('survey',       'survey.delete',       'delete', true),
  ('survey',       'survey.export',       'export', true),
  ('survey',       'survey.manage_access','manage_access', true),
  ('analytics',    'analytics.access',    'access', false),
  ('analytics',    'analytics.view',      'view',   false),
  ('analytics',    'analytics.create',    'create', false),
  ('analytics',    'analytics.export',    'export', false),
  ('dashboard',    'dashboard.access',    'access', false),
  ('dashboard',    'dashboard.view',      'view',   false),
  ('dashboard',    'dashboard.create',    'create', false)
) as p(module_code, code, action, resource_scope)
join platform.iam_modules m on m.code = p.module_code
on conflict (code) do nothing;

-- 4. Roles preset para HCV.
insert into platform.iam_roles (organization_id, code, name, is_system, is_editable)
select o.id, r.code, r.name, true, false
from platform.core_organizations o
cross join (values
  ('owner',        'Owner'),
  ('administrator','Administrator'),
  ('analyst',      'Analyst'),
  ('operator',     'Operator'),
  ('viewer',       'Viewer')
) as r(code, name)
where o.slug = 'hermosillo-como-vamos'
on conflict (organization_id, code) do nothing;

-- Owner: todos los permisos existentes.
insert into platform.iam_role_permissions (role_id, permission_id)
select r.id, p.id
from platform.iam_roles r
join platform.core_organizations o on o.id = r.organization_id and o.slug = 'hermosillo-como-vamos'
cross join platform.iam_permissions p
where r.code = 'owner'
on conflict do nothing;

-- Administrator: todo excepto actualizar la organización o borrar roles.
insert into platform.iam_role_permissions (role_id, permission_id)
select r.id, p.id
from platform.iam_roles r
join platform.core_organizations o on o.id = r.organization_id and o.slug = 'hermosillo-como-vamos'
join platform.iam_permissions p on p.code not in ('organization.update','roles.delete')
where r.code = 'administrator'
on conflict do nothing;

-- Analyst: encuestas + analytics + dashboards, sin borrar ni gestionar accesos.
insert into platform.iam_role_permissions (role_id, permission_id)
select r.id, p.id
from platform.iam_roles r
join platform.core_organizations o on o.id = r.organization_id and o.slug = 'hermosillo-como-vamos'
join platform.iam_permissions p on p.code in (
  'survey.access','survey.view','survey.create','survey.update','survey.export',
  'analytics.access','analytics.view','analytics.create','analytics.export',
  'dashboard.access','dashboard.view','dashboard.create'
)
where r.code = 'analyst'
on conflict do nothing;

-- Operator: captura/consulta de encuestas, sin analytics ni dashboards.
insert into platform.iam_role_permissions (role_id, permission_id)
select r.id, p.id
from platform.iam_roles r
join platform.core_organizations o on o.id = r.organization_id and o.slug = 'hermosillo-como-vamos'
join platform.iam_permissions p on p.code in ('survey.access','survey.view','survey.create','survey.update')
where r.code = 'operator'
on conflict do nothing;

-- Viewer: solo lectura.
insert into platform.iam_role_permissions (role_id, permission_id)
select r.id, p.id
from platform.iam_roles r
join platform.core_organizations o on o.id = r.organization_id and o.slug = 'hermosillo-como-vamos'
join platform.iam_permissions p on p.code in ('survey.view','analytics.view','dashboard.view')
where r.code = 'viewer'
on conflict do nothing;

-- 5. Bootstrap del sysadmin "god mode" de la instalación (busca por email;
-- si esa persona aún no inició sesión en Supabase Auth, avisa y no falla).
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'joseluis.o.santana@hotmail.com';

  if v_user_id is null then
    raise notice 'auth.users sin email joseluis.o.santana@hotmail.com todavía — re-corre este bloque después de su primer login.';
  else
    insert into platform.iam_platform_admins (user_id, role) values (v_user_id, 'sysadmin')
      on conflict (user_id) do nothing;

    insert into platform.core_user_profiles (user_id) values (v_user_id)
      on conflict (user_id) do nothing;

    insert into platform.iam_organization_memberships (organization_id, user_id, status, joined_at)
    select o.id, v_user_id, 'active', now()
    from platform.core_organizations o where o.slug = 'hermosillo-como-vamos'
    on conflict (organization_id, user_id) do nothing;

    insert into platform.iam_membership_roles (membership_id, role_id)
    select mem.id, r.id
    from platform.iam_organization_memberships mem
    join platform.core_organizations o on o.id = mem.organization_id and o.slug = 'hermosillo-como-vamos'
    join platform.iam_roles r on r.organization_id = o.id and r.code = 'owner'
    where mem.user_id = v_user_id
    on conflict do nothing;
  end if;
end $$;
```

- [ ] **Step 2: Run it**

```bash
node scripts/run-sql.js scripts/004_iam_seed_hcv.sql
```

Expected: no errors. If the sysadmin's `auth.users` row doesn't exist yet, a `NOTICE` prints (not a failure) — re-run this same command after that person's first login.

- [ ] **Step 3: Verify counts**

Create `scripts/_verify_seed.sql`:

```sql
select
  (select count(*) from platform.core_organizations) as orgs,
  (select count(*) from platform.iam_modules) as modules,
  (select count(*) from platform.iam_permissions) as permissions,
  (select count(*) from platform.iam_roles) as roles,
  (select count(*) from platform.iam_role_permissions) as role_permissions;
```

```bash
node scripts/run-sql.js scripts/_verify_seed.sql --app
```

Expected: `orgs=1, modules=6, permissions=24, roles=5, role_permissions` > 0 (sum across the 5 roles). Delete `scripts/_verify_seed.sql` afterward.

- [ ] **Step 4: Commit**

```bash
git add scripts/004_iam_seed_hcv.sql
git commit -m "feat(db): seed HCV organization, IAM catalog, default roles, and sysadmin"
```

---

### Task 4: `organization_id` on `survey_*` (domain integration)

**Files:**
- Create: `scripts/005_survey_organization_id.sql`
- Test: run via runner + verification query

**Interfaces:**
- Consumes: `platform.core_organizations` (slug `hermosillo-como-vamos`, from Task 3).
- Produces: `organization_id uuid not null references platform.core_organizations(id)` on all 11 `intersel_insight.survey_*` tables, each indexed. Task 5's RLS policies for `survey_*` assume this column exists on every one of them. This is the one place `intersel_insight` cross-references `platform` — needs `intersel_insight_app` to have `USAGE` on schema `platform` (already true: it owns it).

**Scoping note (deliberate, not an oversight):** this adds a flat FK to `platform.core_organizations` on every table (needed for RLS — spec §19, avoid N-join policies). It does **not** yet add the composite `(organization_id, id)` FKs down the `survey_studies → ... → survey_response_selections` chain that spec §20 describes for defense-in-depth data-integrity (preventing an admin-privileged bug from mismatching a child's `organization_id` against its parent's). That's a separate follow-up — RLS in Task 5 still fully blocks cross-org reads/writes because every table's own `organization_id` is checked directly, independent of the FK chain. Record this gap in `docs/ARQUITECTURA.md` §3 in Task 7.

- [ ] **Step 1: Write the migration**

```sql
-- scripts/005_survey_organization_id.sql
-- Intersel Insight — integrate survey_* as a domain under platform.core_organizations.
-- Source: ARQUITECTURA_BBDD.md §18, §19, §24.
-- Runs via --app (intersel_insight_app owns both schemas; no auth.users touch).
-- Idempotent: guards each ADD COLUMN / ADD CONSTRAINT with a not-exists check.

set search_path = intersel_insight, platform, public;

do $$
declare
  v_org_id uuid;
  v_table text;
  v_tables text[] := array[
    'survey_studies', 'survey_instruments', 'survey_instrument_versions',
    'survey_sections', 'survey_questions', 'survey_variables',
    'survey_answer_options', 'survey_logic_rules', 'survey_observations',
    'survey_responses', 'survey_response_selections'
  ];
begin
  select id into v_org_id from platform.core_organizations where slug = 'hermosillo-como-vamos';
  if v_org_id is null then
    raise exception 'platform.core_organizations "hermosillo-como-vamos" not found — run scripts/004_iam_seed_hcv.sql first';
  end if;

  foreach v_table in array v_tables loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'intersel_insight' and table_name = v_table and column_name = 'organization_id'
    ) then
      execute format('alter table intersel_insight.%I add column organization_id uuid', v_table);
      execute format('update intersel_insight.%I set organization_id = %L', v_table, v_org_id);
      execute format('alter table intersel_insight.%I alter column organization_id set not null', v_table);
      execute format(
        'alter table intersel_insight.%I add constraint %I foreign key (organization_id) references platform.core_organizations(id)',
        v_table, v_table || '_organization_id_fkey'
      );
      execute format('create index %I on intersel_insight.%I (organization_id)', 'idx_' || v_table || '_org', v_table);
    end if;
  end loop;
end $$;

select table_name, column_name
from information_schema.columns
where table_schema = 'intersel_insight' and column_name = 'organization_id'
order by 1;
```

- [ ] **Step 2: Run it**

```bash
node scripts/run-sql.js scripts/005_survey_organization_id.sql --app
```

Expected: 11 rows listing each `survey_*` table with `organization_id`, then `OK: ...`.

- [ ] **Step 3: Verify idempotency**

```bash
node scripts/run-sql.js scripts/005_survey_organization_id.sql --app
```

Expected: same 11-row output, no errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/005_survey_organization_id.sql
git commit -m "feat(db): add organization_id to survey_* tables, backfilled to HCV"
```

---

### Task 5: RLS layer 1 — organization isolation (+ the grants it needs)

**Files:**
- Create: `scripts/006_rls_layer1.sql`
- Test: covered by Task 6's isolation suite (this task just applies + spot-checks it runs clean)

**Interfaces:**
- Consumes: `organization_id` columns from Task 2/4; `platform.iam_organization_memberships`, `platform.iam_platform_admins`.
- Produces: schema `private` with `private.is_platform_admin()` and `private.active_organization_ids()`; RLS **enabled** (not forced), **and matching `GRANT`s**, on every `platform.*` and `intersel_insight.survey_*` table. Task 6's test exercises exactly these policies.

**Correction made while executing this task (kept here so the plan matches reality):** the first draft used `FORCE ROW LEVEL SECURITY`. That also strips the table *owner*'s normal RLS bypass — and `intersel_insight_app` (our own migration/seed role) owns every one of these tables, so `FORCE` locked our own tooling out (`scripts/_verify_seed.sql --app` went from real counts to all zeros). Fixed to plain `ENABLE`/`NO FORCE`: policies still fully restrict the `authenticated` role (real end users, via PostgREST), while the owning role keeps unrestricted access for migrations/seeding — the same bypass-by-owner behavior Supabase's own `service_role` relies on.

- [ ] **Step 1: Write the RLS migration**

```sql
-- scripts/006_rls_layer1.sql
-- Intersel Insight — RLS layer 1: organization isolation only (spec §22-§23).
-- MUST run via the ADMIN connection: CREATE SCHEMA requires CREATE privilege
-- on the database itself, which intersel_insight_app deliberately doesn't
-- have. Idempotent (drop-then-create policies, GRANTs are naturally
-- idempotent).

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
```

- [ ] **Step 2: Run it (admin connection — creates schema `private`)**

```bash
node scripts/run-sql.js scripts/006_rls_layer1.sql
```

Expected: every listed table has `relrowsecurity = true` and `relforcerowsecurity = false`, then `OK: ...`.

- [ ] **Step 3: Sanity-check `intersel_insight_app` itself isn't blocked**

```bash
node scripts/run-sql.js scripts/_verify_seed.sql --app   # reuse Task 3's Step 3 file
```

Expected: same counts as before (Task 3's Step 3: `orgs=1, modules=6, permissions=24, roles=5, role_permissions=65`). RLS is enabled but **not forced**, so the table owner (`intersel_insight_app`, connecting directly here) bypasses it entirely per ordinary Postgres semantics — only the `to authenticated` policies apply, and only to sessions actually holding that role (real end users via PostgREST). This confirms our migration/admin tooling keeps working before Task 6's simulated end-user test.

- [ ] **Step 4: Note the manual Data API step (not SQL-controllable)**

If the frontend will ever query `platform.*` tables directly through `supabase-js`/PostgREST (as opposed to only `intersel_insight.survey_*`, which the delivered app already assumes), schema `platform` needs to be added to **Project Settings → Data API → Exposed schemas** in the Supabase dashboard — `GRANT`s alone don't make PostgREST route to a schema. Note this in `docs/ARQUITECTURA.md` §5 in Task 7; it's not a step this plan can execute via SQL.

- [ ] **Step 5: Commit**

```bash
git add scripts/006_rls_layer1.sql
git commit -m "feat(db): enable RLS layer 1 (organization isolation) on platform/survey tables"
```

---

### Task 6: Cross-organization isolation test suite

**Files:**
- Create: `scripts/tests/001_iam_isolation_test.sql`
- Test: this task **is** the test — Step 2 is "run it and read PASS"

**Interfaces:**
- Consumes: everything from Tasks 2–5 (schema, seed pattern, RLS policies + grants).
- Produces: a repeatable, rollback-only isolation gate, mirroring `supabase/tests/isolation_test.sql`'s pattern for the new org model — this becomes the CI/manual gate referenced from `docs/ARQUITECTURA.md` §2.

- [ ] **Step 1: Write the test**

```sql
-- scripts/tests/001_iam_isolation_test.sql
-- Intersel Insight — cross-organization isolation test (RLS layer 1).
-- Mirrors supabase/tests/isolation_test.sql's pattern for the new org model.
-- Runs entirely inside a transaction and ROLLBACKs — no data left behind.
-- Run: node scripts/run-sql.js scripts/tests/001_iam_isolation_test.sql
-- (admin connection — inserts throwaway auth.users rows for the fixtures).
-- Expected final row: "PASS: cross-organization isolation holds".

begin;

-- Two throwaway auth.users (minimal columns; rolled back at the end).
insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-org-a@example.test', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-org-b@example.test', 'authenticated', 'authenticated');

-- Two throwaway organizations.
insert into platform.core_organizations (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'Test Org A', 'test-org-a'),
  ('22222222-2222-2222-2222-222222222222', 'Test Org B', 'test-org-b');

-- Each user is an active member of their own org only.
insert into platform.iam_organization_memberships (id, organization_id, user_id, status) values
  ('aaaa0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', 'active'),
  ('bbbb0000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-00000000000b', 'active');

-- One survey_studies row per org (survey_* already has organization_id from Task 4).
insert into intersel_insight.survey_studies (id, code, name, organization_id) values
  ('cccc0000-0000-0000-0000-000000000003', 'TEST-A', 'Study A', '11111111-1111-1111-1111-111111111111'),
  ('dddd0000-0000-0000-0000-000000000004', 'TEST-B', 'Study B', '22222222-2222-2222-2222-222222222222');

-- Become an authenticated user of Org A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a"}', true);

do $$
declare n int;
begin
  -- READ: A sees exactly its own org.
  select count(*) into n from platform.core_organizations
    where id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
  if n <> 1 then raise exception 'FAIL read-1: org A sees % of the two test orgs, expected 1', n; end if;

  -- READ: A cannot see org B's row directly.
  if exists (select 1 from platform.core_organizations where id = '22222222-2222-2222-2222-222222222222')
    then raise exception 'FAIL read-2: org A can see org B row'; end if;

  -- READ: A cannot see org B's membership.
  if exists (select 1 from platform.iam_organization_memberships where organization_id = '22222222-2222-2222-2222-222222222222')
    then raise exception 'FAIL read-3: org A can see org B membership'; end if;

  -- READ: A cannot see org B's survey_studies row.
  if exists (select 1 from intersel_insight.survey_studies where id = 'dddd0000-0000-0000-0000-000000000004')
    then raise exception 'FAIL read-4: org A can see org B survey_studies row'; end if;

  -- WRITE: inserting a study into org B must be blocked by WITH CHECK.
  begin
    insert into intersel_insight.survey_studies (code, name, organization_id)
    values ('EVIL', 'evil', '22222222-2222-2222-2222-222222222222');
    raise exception 'FAIL write-1: org A inserted a survey_studies row into org B';
  exception when insufficient_privilege then null; -- expected
  end;

  -- WRITE: updating B's study must affect 0 rows.
  update intersel_insight.survey_studies set name = 'hacked' where id = 'dddd0000-0000-0000-0000-000000000004';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL write-2: org A updated % org B rows', n; end if;

  -- WRITE: deleting B's study must affect 0 rows.
  delete from intersel_insight.survey_studies where id = 'dddd0000-0000-0000-0000-000000000004';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL write-3: org A deleted % org B rows', n; end if;
end $$;

reset role;
select 'PASS: cross-organization isolation holds' as result;

rollback;
```

- [ ] **Step 2: Run it**

```bash
node scripts/run-sql.js scripts/tests/001_iam_isolation_test.sql
```

Expected final output row: `PASS: cross-organization isolation holds`, then `OK: ...`. Any `FAIL ...` message means a policy or grant from Task 5 is wrong — fix that task's SQL and re-run this test, don't patch around it here.

- [ ] **Step 3: Confirm rollback left no residue**

```bash
node scripts/run-sql.js scripts/_verify_seed.sql --app   # reuse Task 3's Step 3 file, then delete it
```

Expected: `orgs=1` (only the real HCV org — the two test orgs from Step 1 were rolled back).

- [ ] **Step 4: Commit**

```bash
git add scripts/tests/001_iam_isolation_test.sql
git commit -m "test(db): add cross-organization RLS isolation gate"
```

---

### Task 7: Documentation catch-up

**Files:**
- Modify: `docs/ARQUITECTURA.md` (§1 note the new `platform` schema, §2/§3/§4 flip from *pendiente* to implemented, note the Task 4 composite-FK scoping decision and the Task 5 Data API dashboard step)
- Modify: `docs/LOG.md` (append entry per `CLAUDE.md` workflow)
- Modify: `.claude/skills/insight-v2/SKILL.md` (mention `scripts/run-sql.js`, the `platform` schema, and the isolation test as the operative pattern)

**Interfaces:** none (docs only).

- [ ] **Step 1: Update `docs/ARQUITECTURA.md` §1**

Add a short paragraph under "Estado del schema `intersel_insight`" noting the new sibling schema `platform` (core_*/iam_*), same database, same owning role, and why it's separate (Task 2's rationale, verbatim reasoning).

- [ ] **Step 2: Update `docs/ARQUITECTURA.md` §2**

Replace the `*Pendiente.*` line under `## 2. Identidad y organizaciones (IAM)` with a short status paragraph: implemented via `scripts/003`–`scripts/006` into schema `platform`; tables, roles/permissions catalog, and RLS org-isolation (with matching grants) are live; link to `scripts/tests/001_iam_isolation_test.sql` as the isolation gate. Note that permission-level authorization (checking `iam_role_permissions`/overrides before a write) is still an application-layer TODO, not enforced by RLS (spec §23 — intentional). Note the Data API "Exposed schemas" manual dashboard step for `platform` from Task 5 Step 4.

- [ ] **Step 3: Update `docs/ARQUITECTURA.md` §3**

Replace `*Pendiente.*` under `## 3. Dominios de datos` with: `survey_*` (schema `intersel_insight`) now carries `organization_id` (Task 4), backfilled to `hermosillo-como-vamos`, FK into `platform.core_organizations`. Note explicitly the deferred composite-FK hardening from spec §20 (see Task 4's "Scoping note") as a named follow-up, not an oversight.

- [ ] **Step 4: Append to `docs/LOG.md`**

One entry, today's date, summarizing: master DB role created, docs/skill scaffolding, local deploy verified, `platform` schema with IAM multi-org foundation + seed + RLS + isolation test shipped, `survey_*` integrated as its first domain.

- [ ] **Step 5: Commit**

```bash
git add docs/ARQUITECTURA.md docs/LOG.md .claude/skills/insight-v2/SKILL.md
git commit -m "docs: mark IAM multi-org foundation (platform schema) implemented"
```

---

## Self-review notes

- **Spec coverage:** ARQUITECTURA_BBDD.md §3–§12 (tables) → Task 2 (schema `platform` — a documented deviation from a single flat schema, not a spec gap). §13 (resolution order) → encoded in `private.is_platform_admin()`/`active_organization_ids()` precedence in Task 5's `using` clauses. §18–§19 (survey_* integration, flat `organization_id`) → Task 4. §20 (composite FK hardening) → explicitly deferred, documented in Task 4 and Task 7. §22–§23 (RLS = isolation only) → Task 5's scope. §26 (sysadmin/multi-org-admin/owner scenarios) → covered by `iam_platform_admins` + ordinary memberships, no special-cased tables needed. §27 (explicitly not building yet: projects, workspaces, groups, etc.) → correctly absent from this plan.
- **Placeholder scan:** none — every step has runnable SQL/JS and concrete expected output.
- **Type/name consistency:** table and column names match `ARQUITECTURA_BBDD.md` verbatim across Tasks 2–6; all cross-schema references are consistently `platform.<table>` from `intersel_insight` and vice versa; `private.active_organization_ids()`/`private.is_platform_admin()` names are used identically everywhere they're referenced.
- **Fixed during review:** the original draft of this plan enabled RLS `to authenticated` without granting the underlying `SELECT`/`INSERT`/`UPDATE`/`DELETE` privileges — that would have made every table unreachable for real end users regardless of what the policies said. Task 5 now grants schema `USAGE` + table privileges alongside every policy, for both `platform.*` (new) and the pre-existing `intersel_insight.survey_*` (which apparently never had these grants either).
