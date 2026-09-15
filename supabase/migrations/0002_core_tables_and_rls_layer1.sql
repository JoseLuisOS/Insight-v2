-- Intersel Insight — Core data model (public schema) + RLS layer 1 (tenant isolation).
-- Model per docs/PLAN.md §4. Layer-2 (role/grant) policies come in the Permisos epic.

-- ============================================================================
-- Tenancy & identity
-- ============================================================================
create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  plan        text not null default 'free',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  display_name text,
  role         text not null default 'viewer' check (role in ('admin','editor','viewer')),
  can_publish  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index profiles_tenant_id_idx on public.profiles (tenant_id);

-- ============================================================================
-- Data layer
-- ============================================================================
create table public.data_sources (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  type        text not null check (type in ('supabase_native','csv_upload','external_pg')),
  name        text not null,
  config_json jsonb not null default '{}'::jsonb,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index data_sources_tenant_id_idx on public.data_sources (tenant_id);

create table public.datasets (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  source_id      uuid references public.data_sources (id) on delete set null,
  name           text not null,
  kind           text not null check (kind in ('table','sql_query','csv_materialized')),
  physical_table text,
  sql_text       text,
  columns_json   jsonb not null default '[]'::jsonb,
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index datasets_tenant_id_idx on public.datasets (tenant_id);

-- ============================================================================
-- Visualization
-- ============================================================================
create table public.charts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  dataset_id  uuid references public.datasets (id) on delete set null,
  name        text not null,
  type        text not null check (type in ('kpi','bar','line','table','pie','area')),
  config_json jsonb not null default '{}'::jsonb,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index charts_tenant_id_idx on public.charts (tenant_id);
create index charts_dataset_id_idx on public.charts (dataset_id);

create table public.dashboards (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  name        text not null,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index dashboards_tenant_id_idx on public.dashboards (tenant_id);

create table public.dashboard_items (
  id           uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards (id) on delete cascade,
  chart_id     uuid references public.charts (id) on delete cascade,
  layout_json  jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index dashboard_items_dashboard_id_idx on public.dashboard_items (dashboard_id);

create table public.dashboard_filters (
  id           uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards (id) on delete cascade,
  type         text not null check (type in ('date_range','dropdown')),
  config_json  jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index dashboard_filters_dashboard_id_idx on public.dashboard_filters (dashboard_id);

-- ============================================================================
-- Publication & permissions
-- ============================================================================
create table public.publications (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  resource_type    text not null check (resource_type in ('chart','dashboard')),
  resource_id      uuid not null,
  visibility       text not null default 'private'
                     check (visibility in ('private','internal','public_link','public_embed')),
  publish_token    text unique,
  settings_json    jsonb not null default '{}'::jsonb,
  refresh_schedule text,
  og_image_path    text,
  created_by       uuid references auth.users (id),
  revoked_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index publications_tenant_id_idx on public.publications (tenant_id);
create index publications_resource_idx on public.publications (resource_type, resource_id);

create table public.resource_grants (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  resource_type  text not null check (resource_type in ('chart','dashboard')),
  resource_id    uuid not null,
  principal_type text not null check (principal_type in ('user','role')),
  principal_id   text not null,
  permission     text not null check (permission in ('view','edit')),
  created_at     timestamptz not null default now()
);
create index resource_grants_tenant_id_idx on public.resource_grants (tenant_id);
create index resource_grants_lookup_idx on public.resource_grants (resource_type, resource_id);

-- ============================================================================
-- Cache & snapshots
-- ============================================================================
create table public.query_cache (
  cache_key   text primary key,
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  result_json jsonb not null,
  computed_at timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index query_cache_tenant_id_idx on public.query_cache (tenant_id);

create table public.snapshots (
  id             uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications (id) on delete cascade,
  data_json      jsonb not null,
  generated_at   timestamptz not null default now()
);
create index snapshots_publication_id_idx on public.snapshots (publication_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create trigger trg_tenants_updated      before update on public.tenants      for each row execute function app.set_updated_at();
create trigger trg_profiles_updated     before update on public.profiles     for each row execute function app.set_updated_at();
create trigger trg_data_sources_updated before update on public.data_sources for each row execute function app.set_updated_at();
create trigger trg_datasets_updated     before update on public.datasets     for each row execute function app.set_updated_at();
create trigger trg_charts_updated       before update on public.charts       for each row execute function app.set_updated_at();
create trigger trg_dashboards_updated   before update on public.dashboards   for each row execute function app.set_updated_at();
create trigger trg_publications_updated before update on public.publications for each row execute function app.set_updated_at();

-- ============================================================================
-- Grants (RLS sits on top of these). anon gets nothing on these tables.
-- ============================================================================
grant select, insert, update, delete on
  public.tenants, public.profiles, public.data_sources, public.datasets,
  public.charts, public.dashboards, public.dashboard_items, public.dashboard_filters,
  public.publications, public.resource_grants, public.query_cache, public.snapshots
  to authenticated;

grant select on public.profiles to supabase_auth_admin;

-- ============================================================================
-- RLS — Layer 1: tenant isolation on every table. TO authenticated only.
-- service_role bypasses RLS (used by Edge Functions for ingest/snapshots).
-- ============================================================================
alter table public.tenants            enable row level security;
alter table public.profiles           enable row level security;
alter table public.data_sources       enable row level security;
alter table public.datasets           enable row level security;
alter table public.charts             enable row level security;
alter table public.dashboards         enable row level security;
alter table public.dashboard_items    enable row level security;
alter table public.dashboard_filters  enable row level security;
alter table public.publications       enable row level security;
alter table public.resource_grants    enable row level security;
alter table public.query_cache        enable row level security;
alter table public.snapshots          enable row level security;

create policy tenant_isolation on public.tenants
  for all to authenticated
  using (id = app.current_tenant_id()) with check (id = app.current_tenant_id());

create policy tenant_isolation on public.profiles
  for all to authenticated
  using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());

create policy tenant_isolation on public.data_sources
  for all to authenticated
  using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());

create policy tenant_isolation on public.datasets
  for all to authenticated
  using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());

create policy tenant_isolation on public.charts
  for all to authenticated
  using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());

create policy tenant_isolation on public.dashboards
  for all to authenticated
  using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());

create policy tenant_isolation on public.publications
  for all to authenticated
  using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());

create policy tenant_isolation on public.resource_grants
  for all to authenticated
  using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());

create policy tenant_isolation on public.query_cache
  for all to authenticated
  using (tenant_id = app.current_tenant_id()) with check (tenant_id = app.current_tenant_id());

-- Child tables: isolation via parent dashboard's tenant.
create policy tenant_isolation on public.dashboard_items
  for all to authenticated
  using (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.tenant_id = app.current_tenant_id()))
  with check (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.tenant_id = app.current_tenant_id()));

create policy tenant_isolation on public.dashboard_filters
  for all to authenticated
  using (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.tenant_id = app.current_tenant_id()))
  with check (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.tenant_id = app.current_tenant_id()));

-- snapshots: isolation via parent publication's tenant (internal reads).
-- The public/anonymous render path uses a SECURITY DEFINER function (Publicación epic).
create policy tenant_isolation on public.snapshots
  for all to authenticated
  using (exists (select 1 from public.publications p where p.id = publication_id and p.tenant_id = app.current_tenant_id()))
  with check (exists (select 1 from public.publications p where p.id = publication_id and p.tenant_id = app.current_tenant_id()));
