-- Organization dashboards for v2 charts. Run as insight_app.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

create table insight_core.core_dashboards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references insight_core.core_organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index core_dashboards_org_creator_idx
  on insight_core.core_dashboards (organization_id, created_by, created_at desc);

create table insight_core.core_dashboard_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  dashboard_id uuid not null,
  chart_id uuid not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  foreign key (organization_id, dashboard_id)
    references insight_core.core_dashboards(organization_id, id) on delete cascade,
  foreign key (organization_id, chart_id)
    references insight_core.core_charts(organization_id, id) on delete cascade,
  unique (dashboard_id, chart_id)
);
create index core_dashboard_items_dashboard_idx
  on insight_core.core_dashboard_items (organization_id, dashboard_id, position);

create table insight_core.core_dashboard_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  dashboard_id uuid not null,
  token text not null unique check (length(token) between 32 and 128),
  snapshot_json jsonb not null check (jsonb_typeof(snapshot_json) = 'object'),
  created_by uuid not null,
  published_at timestamptz not null default now(),
  revoked_at timestamptz,
  foreign key (organization_id, dashboard_id)
    references insight_core.core_dashboards(organization_id, id) on delete cascade
);
create index core_dashboard_publications_dashboard_idx
  on insight_core.core_dashboard_publications (organization_id, dashboard_id, published_at desc);

alter table insight_core.core_dashboards enable row level security;
alter table insight_core.core_dashboard_items enable row level security;
alter table insight_core.core_dashboard_publications enable row level security;
revoke all on insight_core.core_dashboards from anon, authenticated;
revoke all on insight_core.core_dashboard_items from anon, authenticated;
revoke all on insight_core.core_dashboard_publications from anon, authenticated;
commit;
