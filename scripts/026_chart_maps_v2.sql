-- GeoJSON maps for organization charts. Run as insight_app.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
create table insight_core.core_chart_maps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references insight_core.core_organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  name_property text not null check (length(btrim(name_property)) between 1 and 120),
  geojson jsonb not null check (geojson->>'type' = 'FeatureCollection'),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index core_chart_maps_org_creator_idx
  on insight_core.core_chart_maps (organization_id, created_by, created_at desc);
alter table insight_core.core_chart_maps enable row level security;
revoke all on insight_core.core_chart_maps from anon, authenticated;
commit;
