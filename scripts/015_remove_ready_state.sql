-- El catálogo publica con tres estados; la asignación particular corresponde a IAM.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$
begin
  if to_regclass('insight_core.app_groups') is null
     or to_regclass('insight_core.app_modules') is null
     or to_regclass('insight_core.app_module_entitlements') is null then
    raise exception 'El catálogo esperado no existe; revisar antes de migrar';
  end if;
  if exists (select 1 from insight_core.app_module_entitlements where entitled or not enabled) then
    raise exception 'Existen concesiones específicas que requieren revisión antes de eliminar la tabla';
  end if;
end $$;

-- Un estado restringido no se convierte automáticamente en acceso general.
update insight_core.app_groups set state = 'desarrollo', updated_at = now() where state = 'listo';
update insight_core.app_modules set state = 'desarrollo', updated_at = now() where state = 'listo';

alter table insight_core.app_groups drop constraint app_groups_state_check;
alter table insight_core.app_groups add constraint app_groups_state_check
  check (state in ('apagado', 'desarrollo', 'disponible'));
alter table insight_core.app_modules drop constraint app_modules_state_check;
alter table insight_core.app_modules add constraint app_modules_state_check
  check (state in ('apagado', 'desarrollo', 'disponible'));

drop trigger provision_app_entitlements_for_org on insight_core.core_organizations;
drop trigger provision_app_entitlements_for_module on insight_core.app_modules;
drop function insight_core.provision_app_entitlements();
drop table insight_core.app_module_entitlements;

commit;

select 'group' as entity, state, count(*)::integer as total from insight_core.app_groups group by state
union all select 'module', state, count(*)::integer from insight_core.app_modules group by state
order by entity, state;
