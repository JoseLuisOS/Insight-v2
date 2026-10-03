-- Stable organization prefixes and independent, organization-wide survey code cursors.
-- Run as insight_app with scripts/run-sql.js.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

alter table insight_core.core_organizations add column code_prefix text;

with words as (
  select id, array_remove(regexp_split_to_array(
    upper(translate(name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNAEIOUUN')),
    '[^A-Z0-9]+'
  ), '') as parts
  from insight_core.core_organizations
), initials as (
  select id, case
    when cardinality(parts) >= 3 then left(parts[1], 1) || left(parts[2], 1) || left(parts[3], 1)
    when cardinality(parts) = 2 then left(parts[1], 2) || left(parts[2], 1)
    when cardinality(parts) = 1 then left(parts[1], 3)
    else ''
  end as value
  from words
)
update insight_core.core_organizations o
set code_prefix = lpad(i.value, 3, 'X')
from initials i where i.id = o.id;

alter table insight_core.core_organizations
  alter column code_prefix set not null,
  add constraint core_organizations_code_prefix_format check (code_prefix ~ '^[A-Z0-9]{3}$'),
  add constraint core_organizations_code_prefix_unique unique (code_prefix);

create table insight_survey.survey_code_sequences (
  organization_id uuid primary key references insight_core.core_organizations(id) on delete cascade,
  study_last bigint not null default 0 check (study_last >= 0),
  instrument_last bigint not null default 0 check (instrument_last >= 0)
);
alter table insight_survey.survey_code_sequences enable row level security;
revoke all on insight_survey.survey_code_sequences from anon, authenticated;
insert into insight_survey.survey_code_sequences (organization_id)
select id from insight_core.core_organizations;

alter table insight_survey.survey_import_jobs
  add column version text not null default '1.0',
  add constraint survey_import_jobs_version_format check (version ~ '^[1-9][0-9]*[.][0-9]+$');

commit;
