-- Expose the existing survey domain as a managed navigation group.
-- Run with scripts/run-sql.js as insight_app.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

insert into insight_core.app_groups
  (code, name, description, icon, sort_order, state)
values
  ('encuestas', 'Encuestas', 'Instrumentos y respuestas de las encuestas de cada organización.', 'ClipboardList', 15, 'disponible')
on conflict (code) do nothing;

insert into insight_core.app_modules
  (code, group_code, name, description, icon, sort_order, state)
values
  ('encuestas', 'encuestas', 'Encuestas', 'Consulta los instrumentos, versiones y cuestionarios de cada organización.', 'ClipboardList', 0, 'disponible')
on conflict (code) do nothing;

-- The catalog trigger grants operar to existing roles. In this first release,
-- only roles that already have both survey permissions can enter the module.
delete from insight_iam.iam_role_permissions rp
using insight_iam.iam_permissions p, insight_iam.iam_roles r
where rp.permission_id = p.id and p.code = 'encuestas.operar'
  and rp.role_id = r.id
  and not (exists (
    select 1 from insight_iam.iam_role_permissions access_grant
    join insight_iam.iam_permissions access_permission on access_permission.id = access_grant.permission_id
    where access_grant.role_id = r.id and access_permission.code = 'survey.access'
  ) and exists (
    select 1 from insight_iam.iam_role_permissions view_grant
    join insight_iam.iam_permissions view_permission on view_permission.id = view_grant.permission_id
    where view_grant.role_id = r.id and view_permission.code = 'survey.view'
  ));

commit;
