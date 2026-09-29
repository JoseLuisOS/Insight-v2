-- scripts/004_iam_seed_hcv.sql
-- Intersel Insight — IAM seed data (organización HCV + catálogo).
-- MUST run via the ADMIN connection: bootstraps iam_platform_admins, which
-- FKs to auth.users. Idempotent (on conflict do nothing throughout).

set search_path = insight_core, insight_iam, public;

-- 1. Organización inicial.
insert into insight_core.core_organizations (id, name, slug, timezone)
values ('00000000-0000-0000-0000-000000000001', 'Hermosillo ¿Cómo Vamos?', 'hermosillo-como-vamos', 'America/Hermosillo')
on conflict (slug) do nothing;

-- 2. Catálogo de módulos.
insert into insight_iam.iam_modules (code, name, sort_order) values
  ('organization', 'Organización', 10),
  ('members',      'Miembros',     20),
  ('roles',        'Roles',        30),
  ('survey',       'Encuestas',    40),
  ('analytics',    'Análisis',     50),
  ('dashboard',    'Dashboards',   60)
on conflict (code) do nothing;

-- 3. Catálogo de permisos.
insert into insight_iam.iam_permissions (module_id, code, action, supports_resource_scope)
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
join insight_iam.iam_modules m on m.code = p.module_code
on conflict (code) do nothing;

-- 4. Roles preset para HCV.
insert into insight_iam.iam_roles (organization_id, code, name, is_system, is_editable)
select o.id, r.code, r.name, true, false
from insight_core.core_organizations o
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
insert into insight_iam.iam_role_permissions (role_id, permission_id)
select r.id, p.id
from insight_iam.iam_roles r
join insight_core.core_organizations o on o.id = r.organization_id and o.slug = 'hermosillo-como-vamos'
cross join insight_iam.iam_permissions p
where r.code = 'owner'
on conflict do nothing;

-- Administrator: todo excepto actualizar la organización o borrar roles.
insert into insight_iam.iam_role_permissions (role_id, permission_id)
select r.id, p.id
from insight_iam.iam_roles r
join insight_core.core_organizations o on o.id = r.organization_id and o.slug = 'hermosillo-como-vamos'
join insight_iam.iam_permissions p on p.code not in ('organization.update','roles.delete')
where r.code = 'administrator'
on conflict do nothing;

-- Analyst: encuestas + analytics + dashboards, sin borrar ni gestionar accesos.
insert into insight_iam.iam_role_permissions (role_id, permission_id)
select r.id, p.id
from insight_iam.iam_roles r
join insight_core.core_organizations o on o.id = r.organization_id and o.slug = 'hermosillo-como-vamos'
join insight_iam.iam_permissions p on p.code in (
  'survey.access','survey.view','survey.create','survey.update','survey.export',
  'analytics.access','analytics.view','analytics.create','analytics.export',
  'dashboard.access','dashboard.view','dashboard.create'
)
where r.code = 'analyst'
on conflict do nothing;

-- Operator: captura/consulta de encuestas, sin analytics ni dashboards.
insert into insight_iam.iam_role_permissions (role_id, permission_id)
select r.id, p.id
from insight_iam.iam_roles r
join insight_core.core_organizations o on o.id = r.organization_id and o.slug = 'hermosillo-como-vamos'
join insight_iam.iam_permissions p on p.code in ('survey.access','survey.view','survey.create','survey.update')
where r.code = 'operator'
on conflict do nothing;

-- Viewer: solo lectura.
insert into insight_iam.iam_role_permissions (role_id, permission_id)
select r.id, p.id
from insight_iam.iam_roles r
join insight_core.core_organizations o on o.id = r.organization_id and o.slug = 'hermosillo-como-vamos'
join insight_iam.iam_permissions p on p.code in ('survey.view','analytics.view','dashboard.view')
where r.code = 'viewer'
on conflict do nothing;

-- 5. Bootstrap del sysadmin "god mode" de la instalación (busca por email;
-- si esa persona aún no inició sesión en Supabase Auth, avisa y no falla).
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'sysadminodin@temikia.com';

  if v_user_id is null then
    raise notice 'auth.users sin email sysadminodin@temikia.com todavía — re-corre este bloque después de su primer login.';
  else
    insert into insight_iam.iam_platform_admins (user_id, role) values (v_user_id, 'sysadmin')
      on conflict (user_id) do nothing;

    insert into insight_core.core_user_profiles (user_id) values (v_user_id)
      on conflict (user_id) do nothing;

    insert into insight_iam.iam_organization_memberships (organization_id, user_id, status, joined_at)
    select o.id, v_user_id, 'active', now()
    from insight_core.core_organizations o where o.slug = 'hermosillo-como-vamos'
    on conflict (organization_id, user_id) do nothing;

    insert into insight_iam.iam_membership_roles (membership_id, role_id)
    select mem.id, r.id
    from insight_iam.iam_organization_memberships mem
    join insight_core.core_organizations o on o.id = mem.organization_id and o.slug = 'hermosillo-como-vamos'
    join insight_iam.iam_roles r on r.organization_id = o.id and r.code = 'owner'
    where mem.user_id = v_user_id
    on conflict do nothing;
  end if;
end $$;
