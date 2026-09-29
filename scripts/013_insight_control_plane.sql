-- Insight es el panel de control del catálogo, no un módulo gestionable.
-- Ejecutar como insight_app después de 012.
begin;

do $$
begin
  if (select count(*) from insight_core.app_submodules where module_code = 'insight') <> 1
     or not exists (select 1 from insight_core.app_submodules where code = 'modulos' and module_code = 'insight') then
    raise exception 'El catálogo Insight no tiene la forma esperada; revisar antes de continuar';
  end if;
end $$;

delete from insight_core.app_submodule_entitlements where submodule_code = 'modulos';
delete from insight_core.app_submodules where code = 'modulos' and module_code = 'insight';
delete from insight_core.app_modules where code = 'insight';

alter table insight_core.app_modules
  add constraint app_modules_reserved_insight check (code <> 'insight');
alter table insight_core.app_submodules
  add constraint app_submodules_reserved_modulos check (code <> 'modulos');

commit;
