-- Bring Roles and Permisos into the managed catalog. Run as insight_app.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

create or replace function insight_iam.sync_catalog_module_permission()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_module_id uuid;
begin
  insert into insight_iam.iam_modules(code, name, description, active, sort_order)
  values (new.code, new.name, new.description, new.active, new.sort_order)
  on conflict (code) do update set
    name = excluded.name,
    description = excluded.description,
    active = excluded.active,
    sort_order = excluded.sort_order
  returning id into v_module_id;

  insert into insight_iam.iam_permissions(module_id, code, action, description)
  values (v_module_id, new.code || '.operar', 'operar', 'Permite ver y operar el módulo ' || new.name || '.')
  on conflict (code) do nothing;

  if tg_op = 'INSERT' then
    insert into insight_iam.iam_role_permissions(role_id, permission_id)
    select r.id, p.id from insight_iam.iam_roles r
    join insight_iam.iam_permissions p on p.code = new.code || '.operar'
    on conflict do nothing;
  end if;
  return new;
end $$;

insert into insight_core.app_modules
  (code, group_code, name, description, icon, sort_order, state)
values
  ('insight_roles', 'administracion', 'Roles', 'Gestiona roles y sus permisos por organización.', 'UserCog', 20, 'desarrollo'),
  ('insight_permissions', 'administracion', 'Permisos', 'Administra las acciones disponibles en cada módulo.', 'KeyRound', 30, 'desarrollo')
on conflict (code) do nothing;

commit;
