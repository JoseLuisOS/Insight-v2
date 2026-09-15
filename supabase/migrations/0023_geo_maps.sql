-- Ola 3: choropleth maps. Tenants upload a GeoJSON; charts of type 'map' color
-- regions by an aggregated value. name_property = the GeoJSON feature property
-- that holds region names (matched against the data's category column).
create table public.maps (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  name          text not null,
  name_property text not null default 'name',
  geojson       jsonb not null,
  created_by    uuid references auth.users (id),
  created_at    timestamptz not null default now()
);
create index maps_tenant_id_idx on public.maps (tenant_id);

grant select, insert, update, delete on public.maps to authenticated;
alter table public.maps enable row level security;

create policy members_read on public.maps for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy writers_all on public.maps for all to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'))
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'));
