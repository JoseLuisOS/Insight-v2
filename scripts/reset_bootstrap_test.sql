-- scripts/reset_bootstrap_test.sql
-- Intersel Insight — full reset for testing the onboarding bootstrap flow
-- from scratch (login with temp password -> forced change -> "create the
-- first organization" -> dashboard).
--
-- Deletes:
--   - All survey_* demo rows (they FK to core_organizations with RESTRICT,
--     not CASCADE, so the org can't be deleted while they reference it —
--     this is the "Demo Seed V2" data from scripts/002, fully reproducible)
--   - The organization itself (insight_core.core_organizations), which CASCADEs
--     to iam_organization_memberships, iam_roles, iam_role_permissions,
--     iam_membership_roles, iam_resources, iam_resource_permissions
--   - The test user's core_user_profiles row
--
-- Keeps:
--   - insight_iam.iam_platform_admins (the sysadmin flag itself — without it
--     nobody could ever pass the bootstrap_first_organization() check)
--   - insight_iam.iam_modules / iam_permissions (shared catalog, not org data)
--
-- Does NOT touch auth.users / passwords — see scripts/create_user.js for
-- resetting the temp password + must_change_password flag.
--
-- Runs with the default insight_app connection.

set search_path = insight_survey, insight_core, insight_iam, public;

-- survey_* in dependency order (children before parents; several of these
-- FKs are ON DELETE RESTRICT, not CASCADE — see scripts/001).
delete from insight_survey.survey_response_selections;
delete from insight_survey.survey_responses;
delete from insight_survey.survey_observations;
delete from insight_survey.survey_logic_rules;
delete from insight_survey.survey_answer_options;
delete from insight_survey.survey_variables;
delete from insight_survey.survey_questions;
delete from insight_survey.survey_sections;
delete from insight_survey.survey_instrument_versions;
delete from insight_survey.survey_instruments;
delete from insight_survey.survey_studies;

-- The user's profile row (harmless to drop — nothing reads it yet).
delete from insight_core.core_user_profiles;

-- The organization itself — cascades the remaining organization-scoped tables.
delete from insight_core.core_organizations;

select
  (select count(*) from insight_core.core_organizations) as orgs,
  (select count(*) from insight_iam.iam_organization_memberships) as memberships,
  (select count(*) from insight_iam.iam_platform_admins) as platform_admins,
  (select count(*) from insight_survey.survey_studies) as survey_studies;
