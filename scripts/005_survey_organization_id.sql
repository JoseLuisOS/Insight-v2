-- scripts/005_survey_organization_id.sql
-- Intersel Insight — integrate survey_* as a domain under platform.core_organizations.
-- Source: ARQUITECTURA_BBDD.md §18, §19, §24.
-- Runs via --app (intersel_insight_app owns both schemas; no auth.users touch).
-- Idempotent: guards each ADD COLUMN / ADD CONSTRAINT with a not-exists check.

set search_path = intersel_insight, platform, public;

do $$
declare
  v_org_id uuid;
  v_table text;
  v_tables text[] := array[
    'survey_studies', 'survey_instruments', 'survey_instrument_versions',
    'survey_sections', 'survey_questions', 'survey_variables',
    'survey_answer_options', 'survey_logic_rules', 'survey_observations',
    'survey_responses', 'survey_response_selections'
  ];
begin
  select id into v_org_id from platform.core_organizations where slug = 'hermosillo-como-vamos';
  if v_org_id is null then
    raise exception 'platform.core_organizations "hermosillo-como-vamos" not found — run scripts/004_iam_seed_hcv.sql first';
  end if;

  foreach v_table in array v_tables loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'intersel_insight' and table_name = v_table and column_name = 'organization_id'
    ) then
      execute format('alter table intersel_insight.%I add column organization_id uuid', v_table);
      execute format('update intersel_insight.%I set organization_id = %L', v_table, v_org_id);
      execute format('alter table intersel_insight.%I alter column organization_id set not null', v_table);
      execute format(
        'alter table intersel_insight.%I add constraint %I foreign key (organization_id) references platform.core_organizations(id)',
        v_table, v_table || '_organization_id_fkey'
      );
      execute format('create index %I on intersel_insight.%I (organization_id)', 'idx_' || v_table || '_org', v_table);
    end if;
  end loop;
end $$;

select table_name, column_name
from information_schema.columns
where table_schema = 'intersel_insight' and column_name = 'organization_id'
order by 1;
