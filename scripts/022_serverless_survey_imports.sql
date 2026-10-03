-- Files are uploaded directly to a private Storage bucket; Vercel receives metadata only.
alter table insight_survey.survey_import_jobs
  alter column source_bytes drop not null,
  alter column source_sha256 drop not null;

alter table insight_survey.survey_import_jobs
  add column if not exists storage_path text,
  add column if not exists column_mapping jsonb not null default '{}'::jsonb,
  add column if not exists workflow_run_id text;

alter table insight_survey.survey_import_jobs
  drop constraint if exists survey_import_jobs_status_check;
alter table insight_survey.survey_import_jobs
  add constraint survey_import_jobs_status_check
  check (status in ('uploading','ready','queued','processing','completed','failed'));

alter table insight_survey.survey_import_jobs
  add constraint survey_import_jobs_source_check
  check (source_bytes is not null or storage_path is not null);

create unique index if not exists idx_survey_import_jobs_storage_path
  on insight_survey.survey_import_jobs (storage_path)
  where storage_path is not null;

create table if not exists insight_survey.survey_import_job_chunks (
  job_id uuid not null references insight_survey.survey_import_jobs(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  organization_id uuid not null references insight_core.core_organizations(id),
  observation_count integer not null check (observation_count > 0),
  response_count integer not null check (response_count > 0),
  created_at timestamptz not null default now(),
  primary key (job_id, chunk_index)
);

alter table insight_survey.survey_import_job_chunks enable row level security;
revoke all on insight_survey.survey_import_job_chunks from anon, authenticated;
