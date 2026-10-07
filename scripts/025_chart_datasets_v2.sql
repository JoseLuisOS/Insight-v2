-- Flat datasets for organization charts. Run as insight_app.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

create table insight_core.core_datasets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references insight_core.core_organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  columns_json jsonb not null check (jsonb_typeof(columns_json) = 'array'),
  row_count integer not null default 0 check (row_count >= 0),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index core_datasets_org_creator_idx
  on insight_core.core_datasets (organization_id, created_by, created_at desc);

create table insight_core.core_dataset_rows (
  organization_id uuid not null,
  dataset_id uuid not null,
  row_number integer not null check (row_number >= 1),
  values_json jsonb not null check (jsonb_typeof(values_json) = 'object'),
  primary key (dataset_id, row_number),
  foreign key (organization_id, dataset_id)
    references insight_core.core_datasets(organization_id, id) on delete cascade
);

create function insight_core.validate_core_chart_dataset_source() returns trigger
language plpgsql as $$
begin
  if new.source_kind = 'dataset' and not exists (
    select 1 from insight_core.core_datasets d
    where d.id = new.source_id and d.organization_id = new.organization_id
  ) then
    raise exception 'Dataset source must belong to chart organization';
  end if;
  return new;
end;
$$;
create trigger core_charts_validate_dataset_source
  before insert or update of organization_id, source_kind, source_id
  on insight_core.core_charts for each row
  execute function insight_core.validate_core_chart_dataset_source();
revoke all on function insight_core.validate_core_chart_dataset_source() from public, anon, authenticated;

alter table insight_core.core_datasets enable row level security;
alter table insight_core.core_dataset_rows enable row level security;
revoke all on insight_core.core_datasets from anon, authenticated;
revoke all on insight_core.core_dataset_rows from anon, authenticated;
commit;
