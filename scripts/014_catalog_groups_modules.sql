-- Nomenclatura del catálogo: grupos contienen módulos.
-- Insight opera estos objetos directamente mediante insight_app.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$
begin
  if to_regclass('insight_core.app_modules') is null
     or to_regclass('insight_core.app_submodules') is null
     or to_regclass('insight_core.app_groups') is not null then
    raise exception 'Estado de catálogo inesperado; revisar antes de renombrar';
  end if;
  if not exists (select 1 from pg_attribute where attrelid = 'insight_core.app_submodules'::regclass and attname = 'module_code' and not attisdropped)
     or not exists (select 1 from pg_attribute where attrelid = 'insight_core.app_submodule_entitlements'::regclass and attname = 'submodule_code' and not attisdropped) then
    raise exception 'Columnas de catálogo inesperadas';
  end if;
end $$;

alter table insight_core.app_modules rename to app_groups;
alter table insight_core.app_submodules rename to app_modules;
alter table insight_core.app_modules rename column module_code to group_code;
alter table insight_core.app_submodule_entitlements rename column submodule_code to module_code;

alter table insight_core.app_groups rename constraint app_modules_pkey to app_groups_pkey;
alter table insight_core.app_groups rename constraint app_modules_code_check to app_groups_code_check;
alter table insight_core.app_groups rename constraint app_modules_name_check to app_groups_name_check;
alter table insight_core.app_groups rename constraint app_modules_sort_order_check to app_groups_sort_order_check;
alter table insight_core.app_groups rename constraint app_modules_state_check to app_groups_state_check;
alter table insight_core.app_groups rename constraint app_modules_check to app_groups_check;
alter table insight_core.app_groups rename constraint app_modules_reserved_insight to app_groups_reserved_insight;

alter table insight_core.app_modules rename constraint app_submodules_pkey to app_modules_pkey;
alter table insight_core.app_modules rename constraint app_submodules_code_check to app_modules_code_check;
alter table insight_core.app_modules rename constraint app_submodules_name_check to app_modules_name_check;
alter table insight_core.app_modules rename constraint app_submodules_sort_order_check to app_modules_sort_order_check;
alter table insight_core.app_modules rename constraint app_submodules_state_check to app_modules_state_check;
alter table insight_core.app_modules rename constraint app_submodules_check to app_modules_check;
alter table insight_core.app_modules rename constraint app_submodules_module_code_fkey to app_modules_group_code_fkey;
alter table insight_core.app_modules rename constraint app_submodules_reserved_modulos to app_modules_reserved_modulos;
alter table insight_core.app_submodule_entitlements rename constraint app_submodule_entitlements_pkey to app_module_entitlements_pkey;
alter table insight_core.app_submodule_entitlements rename constraint app_submodule_entitlements_organization_id_fkey to app_module_entitlements_organization_id_fkey;
alter table insight_core.app_submodule_entitlements rename constraint app_submodule_entitlements_submodule_code_fkey to app_module_entitlements_module_code_fkey;
alter table insight_core.app_submodule_entitlements rename to app_module_entitlements;

alter index insight_core.app_submodules_order rename to app_modules_group_order;
alter trigger provision_app_entitlements_for_submodule on insight_core.app_modules rename to provision_app_entitlements_for_module;

alter table insight_core.app_module_audit drop constraint app_module_audit_entity_check;
update insight_core.app_module_audit
set before_value = case when before_value ? 'module_code'
    then (before_value - 'module_code') || jsonb_build_object('group_code', before_value -> 'module_code')
    else before_value end,
    after_value = case when after_value ? 'module_code'
    then (after_value - 'module_code') || jsonb_build_object('group_code', after_value -> 'module_code')
    else after_value end
where entity = 'submodule';
update insight_core.app_module_audit
set entity = case entity when 'module' then 'group' when 'submodule' then 'module' else entity end;
alter table insight_core.app_module_audit add constraint app_module_audit_entity_check check (entity in ('group','module'));

alter table insight_core.app_modules drop constraint app_modules_reserved_modulos;
alter table insight_core.app_modules add constraint app_modules_reserved_insight_catalog check (code <> 'insight_catalog');

create or replace function insight_core.provision_app_entitlements() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_TABLE_NAME = 'core_organizations' then
    insert into insight_core.app_module_entitlements(organization_id,module_code)
    select NEW.id, code from insight_core.app_modules;
  else
    insert into insight_core.app_module_entitlements(organization_id,module_code)
    select id, NEW.code from insight_core.core_organizations;
  end if;
  return NEW;
end $$;

commit;
