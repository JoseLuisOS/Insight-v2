-- Une los módulos del catálogo con IAM. Ejecutar como insight_app.
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
  return new;
end $$;

drop trigger if exists sync_catalog_module_permission on insight_core.app_modules;
create trigger sync_catalog_module_permission
after insert or update of name, description, active, sort_order on insight_core.app_modules
for each row execute function insight_iam.sync_catalog_module_permission();

-- El trigger cubre altas futuras; estas filas cubren el catálogo actual.
update insight_core.app_modules set name = name;

-- Conservar la visibilidad existente para los roles ya creados. La excepción
-- individual DENY sigue prevaleciendo sobre la concesión del rol.
insert into insight_iam.iam_role_permissions(role_id, permission_id)
select r.id, p.id
from insight_iam.iam_roles r
cross join insight_core.app_modules m
join insight_iam.iam_permissions p on p.code = m.code || '.operar'
on conflict do nothing;

commit;

select count(*)::integer as catalog_modules,
       count(p.id)::integer as operate_permissions
from insight_core.app_modules m
left join insight_iam.iam_permissions p on p.code = m.code || '.operar';
