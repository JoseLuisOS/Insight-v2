-- scripts/tests/001_iam_isolation_test.sql
-- Intersel Insight — cross-organization isolation test (RLS layer 1).
-- Mirrors supabase/tests/isolation_test.sql's pattern for the new org model.
-- Runs entirely inside a transaction and ROLLBACKs — no data left behind.
-- Run: node scripts/run-sql.js scripts/tests/001_iam_isolation_test.sql
-- (admin connection — inserts throwaway auth.users rows for the fixtures).
-- Expected final row: "PASS: cross-organization isolation holds".

begin;

-- Two throwaway auth.users (minimal columns; rolled back at the end).
insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-0000-0000-00000000000a', 'test-org-a@example.test', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-00000000000b', 'test-org-b@example.test', 'authenticated', 'authenticated');

-- Two throwaway organizations.
insert into platform.core_organizations (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'Test Org A', 'test-org-a'),
  ('22222222-2222-2222-2222-222222222222', 'Test Org B', 'test-org-b');

-- Each user is an active member of their own org only.
insert into platform.iam_organization_memberships (id, organization_id, user_id, status) values
  ('aaaa0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', 'active'),
  ('bbbb0000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-00000000000b', 'active');

-- One survey_studies row per org (survey_* already has organization_id from Task 4).
insert into intersel_insight.survey_studies (id, code, name, organization_id) values
  ('cccc0000-0000-0000-0000-000000000003', 'TEST-A', 'Study A', '11111111-1111-1111-1111-111111111111'),
  ('dddd0000-0000-0000-0000-000000000004', 'TEST-B', 'Study B', '22222222-2222-2222-2222-222222222222');

-- Become an authenticated user of Org A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a"}', true);

do $$
declare n int;
begin
  -- READ: A sees exactly its own org.
  select count(*) into n from platform.core_organizations
    where id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
  if n <> 1 then raise exception 'FAIL read-1: org A sees % of the two test orgs, expected 1', n; end if;

  -- READ: A cannot see org B's row directly.
  if exists (select 1 from platform.core_organizations where id = '22222222-2222-2222-2222-222222222222')
    then raise exception 'FAIL read-2: org A can see org B row'; end if;

  -- READ: A cannot see org B's membership.
  if exists (select 1 from platform.iam_organization_memberships where organization_id = '22222222-2222-2222-2222-222222222222')
    then raise exception 'FAIL read-3: org A can see org B membership'; end if;

  -- READ: A cannot see org B's survey_studies row.
  if exists (select 1 from intersel_insight.survey_studies where id = 'dddd0000-0000-0000-0000-000000000004')
    then raise exception 'FAIL read-4: org A can see org B survey_studies row'; end if;

  -- WRITE: inserting a study into org B must be blocked by WITH CHECK.
  begin
    insert into intersel_insight.survey_studies (code, name, organization_id)
    values ('EVIL', 'evil', '22222222-2222-2222-2222-222222222222');
    raise exception 'FAIL write-1: org A inserted a survey_studies row into org B';
  exception when insufficient_privilege then null; -- expected
  end;

  -- WRITE: updating B's study must affect 0 rows.
  update intersel_insight.survey_studies set name = 'hacked' where id = 'dddd0000-0000-0000-0000-000000000004';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL write-2: org A updated % org B rows', n; end if;

  -- WRITE: deleting B's study must affect 0 rows.
  delete from intersel_insight.survey_studies where id = 'dddd0000-0000-0000-0000-000000000004';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL write-3: org A deleted % org B rows', n; end if;
end $$;

reset role;
select 'PASS: cross-organization isolation holds' as result;

rollback;
