-- scripts/reset_bootstrap_test.sql
-- Intersel Insight — full reset for testing the onboarding bootstrap flow
-- from scratch (login with temp password -> forced change -> "create the
-- first organization" -> dashboard).
--
-- Deletes:
--   - All survey_* demo rows (they FK to core_organizations with RESTRICT,
--     not CASCADE, so the org can't be deleted while they reference it —
--     this is the "Demo Seed V2" data from scripts/002, fully reproducible)
--   - The organization itself (platform.core_organizations), which CASCADEs
--     to iam_organization_memberships, iam_roles, iam_role_permissions,
--     iam_membership_roles, iam_resources, iam_resource_permissions
--   - The test user's core_user_profiles row
--
-- Keeps:
--   - platform.iam_platform_admins (the sysadmin flag itself — without it
--     nobody could ever pass the bootstrap_first_organization() check)
--   - platform.iam_modules / iam_permissions (shared catalog, not org data)
--
-- Does NOT touch auth.users / passwords — see scripts/create_user.js for
-- resetting the temp password + must_change_password flag.
--
-- Runs via --app.

set search_path = intersel_insight, platform, public;

-- survey_* in dependency order (children before parents; several of these
-- FKs are ON DELETE RESTRICT, not CASCADE — see scripts/001).
delete from intersel_insight.survey_response_selections;
delete from intersel_insight.survey_responses;
delete from intersel_insight.survey_observations;
delete from intersel_insight.survey_logic_rules;
delete from intersel_insight.survey_answer_options;
delete from intersel_insight.survey_variables;
delete from intersel_insight.survey_questions;
delete from intersel_insight.survey_sections;
delete from intersel_insight.survey_instrument_versions;
delete from intersel_insight.survey_instruments;
delete from intersel_insight.survey_studies;

-- The user's profile row (harmless to drop — nothing reads it yet).
delete from platform.core_user_profiles;

-- The organization itself — cascades the rest of the org-scoped platform.* tables.
delete from platform.core_organizations;

select
  (select count(*) from platform.core_organizations) as orgs,
  (select count(*) from platform.iam_organization_memberships) as memberships,
  (select count(*) from platform.iam_platform_admins) as platform_admins,
  (select count(*) from intersel_insight.survey_studies) as survey_studies;
