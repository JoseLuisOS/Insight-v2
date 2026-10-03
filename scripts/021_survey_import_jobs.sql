-- Durable, organization-scoped survey workbook imports.
-- Run as insight_app with scripts/run-sql.js.
create table if not exists insight_survey.survey_import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references insight_core.core_organizations(id),
  created_by uuid not null,
  study_code text not null,
  study_name text not null,
  instrument_code text not null,
  instrument_name text not null,
  source_filename text not null,
  source_sha256 text not null,
  source_bytes bytea not null,
  preview jsonb not null default '{}'::jsonb,
  status text not null default 'ready' check (status in ('ready','queued','processing','completed','failed')),
  error_message text,
  instrument_id uuid references insight_survey.survey_instruments(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  check (length(study_code) between 2 and 60),
  check (length(instrument_code) between 2 and 60),
  check (length(source_sha256) = 64),
  check (octet_length(source_bytes) between 1 and 10485760)
);

create index if not exists idx_survey_import_jobs_org_created
  on insight_survey.survey_import_jobs (organization_id, created_at desc);
create index if not exists idx_survey_import_jobs_queue
  on insight_survey.survey_import_jobs (created_at)
  where status in ('queued','processing');

alter table insight_survey.survey_import_jobs enable row level security;
revoke all on insight_survey.survey_import_jobs from anon, authenticated;
