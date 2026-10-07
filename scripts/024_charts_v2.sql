-- Gráficas v2: almacenamiento privado por organización.
-- Run as insight_app with scripts/run-sql.js. No public/Data API grants.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

create table insight_core.core_charts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references insight_core.core_organizations(id) on delete cascade,
  source_kind text not null check (source_kind in ('dataset', 'survey')),
  source_id uuid not null,
  source_version_id uuid references insight_survey.survey_instrument_versions(id),
  name text not null check (length(btrim(name)) between 1 and 160),
  definition_version integer not null default 2 check (definition_version >= 2),
  definition_json jsonb not null check (jsonb_typeof(definition_json) = 'object'),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  check (
    (source_kind = 'survey' and source_version_id is not null)
    or (source_kind = 'dataset' and source_version_id is null)
  )
);

create index core_charts_org_creator_created_idx
  on insight_core.core_charts (organization_id, created_by, created_at desc);
create index core_charts_source_idx
  on insight_core.core_charts (organization_id, source_kind, source_id, source_version_id);

create function insight_core.validate_core_chart_source() returns trigger
language plpgsql as $$
begin
  if new.source_kind = 'survey' and not exists (
    select 1
    from insight_survey.survey_instruments i
    join insight_survey.survey_instrument_versions v
      on v.instrument_id = i.id and v.organization_id = i.organization_id
    where i.id = new.source_id
      and v.id = new.source_version_id
      and i.organization_id = new.organization_id
  ) then
    raise exception 'Survey source and version must belong to chart organization';
  end if;
  return new;
end;
$$;
create trigger core_charts_validate_source
  before insert or update of organization_id, source_kind, source_id, source_version_id
  on insight_core.core_charts for each row
  execute function insight_core.validate_core_chart_source();
revoke all on function insight_core.validate_core_chart_source() from public, anon, authenticated;

create table insight_core.core_chart_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  chart_id uuid not null,
  token text not null unique check (length(token) between 32 and 128),
  snapshot_json jsonb not null check (jsonb_typeof(snapshot_json) = 'object'),
  created_by uuid not null,
  published_at timestamptz not null default now(),
  revoked_at timestamptz,
  foreign key (organization_id, chart_id)
    references insight_core.core_charts(organization_id, id) on delete cascade
);
create index core_chart_publications_chart_idx
  on insight_core.core_chart_publications (organization_id, chart_id, published_at desc);

create table insight_core.core_chart_annotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  chart_id uuid not null,
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, chart_id)
    references insight_core.core_charts(organization_id, id) on delete cascade
);
create index core_chart_annotations_chart_idx
  on insight_core.core_chart_annotations (organization_id, chart_id, created_at desc);

alter table insight_core.core_charts enable row level security;
alter table insight_core.core_chart_publications enable row level security;
alter table insight_core.core_chart_annotations enable row level security;
revoke all on insight_core.core_charts from anon, authenticated;
revoke all on insight_core.core_chart_publications from anon, authenticated;
revoke all on insight_core.core_chart_annotations from anon, authenticated;

commit;
