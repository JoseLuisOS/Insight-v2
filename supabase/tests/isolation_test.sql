-- Intersel Insight — Cross-tenant isolation test (RLS layer 1).
-- EXIT CRITERION for Fase 0 and intended as a CI gate (PLAN.md §9, §10).
--
-- Runs entirely inside a transaction and ROLLBACKs, leaving no data behind.
-- A user authenticated as Tenant A must NOT be able to read or write Tenant B's
-- rows. Any violation raises an exception (which fails the run).
--
-- Run against the cloud project, e.g.:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/isolation_test.sql
-- Expected final row: "PASS: cross-tenant isolation holds".

begin;

-- Seed two tenants and one chart each (as the migration/admin role).
insert into public.tenants (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111','Test A','test-a'),
  ('22222222-2222-2222-2222-222222222222','Test B','test-b');

insert into public.charts (id, tenant_id, name, type) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Chart A','bar'),
  ('bbbbbbbb-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Chart B','line');

-- Become an authenticated user of Tenant A.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"app_metadata":{"tenant_id":"11111111-1111-1111-1111-111111111111","role":"admin","can_publish":true}}',
  true
);

do $$
declare n int;
begin
  -- READ: A sees exactly its own chart.
  select count(*) into n from public.charts;
  if n <> 1 then raise exception 'FAIL read-1: tenant A sees % charts, expected 1', n; end if;

  -- READ: A cannot see any of B's rows.
  if exists (select 1 from public.charts where tenant_id = '22222222-2222-2222-2222-222222222222')
    then raise exception 'FAIL read-2: tenant A can see tenant B charts'; end if;

  -- READ: A cannot fetch B's chart by id.
  if exists (select 1 from public.charts where id = 'bbbbbbbb-0000-0000-0000-000000000002')
    then raise exception 'FAIL read-3: tenant A fetched tenant B chart by id'; end if;

  -- READ: A cannot see B's tenant row.
  if exists (select 1 from public.tenants where id = '22222222-2222-2222-2222-222222222222')
    then raise exception 'FAIL read-4: tenant A can see tenant B row'; end if;

  -- WRITE: inserting into tenant B must be blocked by WITH CHECK.
  begin
    insert into public.charts (tenant_id, name, type)
    values ('22222222-2222-2222-2222-222222222222','evil','bar');
    raise exception 'FAIL write-1: tenant A inserted a chart into tenant B';
  exception when insufficient_privilege then null; -- expected
  end;

  -- WRITE: updating B's chart must affect 0 rows.
  update public.charts set name = 'hacked' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL write-2: tenant A updated % tenant B rows', n; end if;

  -- WRITE: deleting B's chart must affect 0 rows.
  delete from public.charts where id = 'bbbbbbbb-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL write-3: tenant A deleted % tenant B rows', n; end if;
end $$;

select 'PASS: cross-tenant isolation holds' as result;

rollback;
