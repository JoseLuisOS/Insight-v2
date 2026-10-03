-- The old Administration / Organización placeholder is replaced by the
-- fixed Insight / Organizaciones manager. Run as insight_app.
begin;
do $$ begin
  if not exists (select 1 from insight_core.app_modules
                 where code = 'organizacion' and group_code = 'administracion') then
    raise exception 'No se encontró el módulo antiguo esperado.';
  end if;
  if exists (select 1 from insight_iam.iam_permissions p
             join insight_iam.iam_modules m on m.id = p.module_id
             where m.code = 'organizacion' and (p.code <> 'organizacion.operar' or p.action <> 'operar')) then
    raise exception 'El módulo antiguo tiene permisos adicionales; revisar antes de retirarlo.';
  end if;
  if exists (select 1 from insight_iam.iam_user_permission_overrides o
             join insight_iam.iam_permissions p on p.id = o.permission_id
             join insight_iam.iam_modules m on m.id = p.module_id
             where m.code = 'organizacion') then
    raise exception 'El módulo antiguo tiene excepciones individuales; revisar antes de retirarlo.';
  end if;
  if exists (select 1 from insight_iam.iam_resource_permissions rp
             join insight_iam.iam_permissions p on p.id = rp.permission_id
             join insight_iam.iam_modules m on m.id = p.module_id
             where m.code = 'organizacion') then
    raise exception 'El módulo antiguo tiene concesiones de recursos; revisar antes de retirarlo.';
  end if;
end $$;

delete from insight_core.app_modules where code = 'organizacion';
delete from insight_iam.iam_permissions
  where module_id in (select id from insight_iam.iam_modules where code = 'organizacion');
delete from insight_iam.iam_modules where code = 'organizacion';
commit;
