-- Galería de Gráficas: visibilidad dentro de la organización y vista previa persistida.
-- Run as insight_app with scripts/run-sql.js. No public/Data API grants.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

alter table insight_core.core_charts
  add column visibility text not null default 'private',
  add column preview_json jsonb,
  add column preview_updated_at timestamptz,
  add constraint core_charts_visibility_check check (visibility in ('private', 'organization')),
  add constraint core_charts_preview_object check (preview_json is null or jsonb_typeof(preview_json) = 'object');

-- Galería compartida: gráficas visibles para la organización, más recientes primero.
create index core_charts_org_shared_idx
  on insight_core.core_charts (organization_id, updated_at desc)
  where visibility = 'organization';

commit;
