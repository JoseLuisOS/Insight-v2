-- Intersel Insight — RLS Layer-2 permission tests (roles + per-object grants).
-- Runs in a transaction and ROLLBACKs. Expected final row: "PASS: ...".

begin;
insert into public.tenants (id, name, slug) values ('77777777-7777-7777-7777-777777777777','Perm Co','perm-co');
insert into auth.users (id, instance_id, aud, role, email) values
 ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@perm.co'),
 ('e0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','editor@perm.co'),
 ('b0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer@perm.co');
insert into public.profiles (id, tenant_id, role, can_publish) values
 ('a0000000-0000-0000-0000-000000000001','77777777-7777-7777-7777-777777777777','admin', true),
 ('e0000000-0000-0000-0000-000000000002','77777777-7777-7777-7777-777777777777','editor', false),
 ('b0000000-0000-0000-0000-000000000003','77777777-7777-7777-7777-777777777777','viewer', false);

set local role authenticated;

-- EDITOR can create a chart.
select set_config('request.jwt.claims','{"sub":"e0000000-0000-0000-0000-000000000002"}',true);
do $$
declare cid uuid;
begin
  insert into public.charts (tenant_id,name,type)
  values ('77777777-7777-7777-7777-777777777777','Editor Chart','bar') returning id into cid;
  perform set_config('test.cid', cid::text, false);
end $$;

-- VIEWER: read yes; insert/update/escalation no.
select set_config('request.jwt.claims','{"sub":"b0000000-0000-0000-0000-000000000003"}',true);
do $$
declare cid uuid := current_setting('test.cid')::uuid; n int;
begin
  select count(*) into n from public.charts; if n < 1 then raise exception 'FAIL: viewer cannot read'; end if;
  begin insert into public.charts (tenant_id,name,type) values ('77777777-7777-7777-7777-777777777777','x','bar');
        raise exception 'FAIL: viewer inserted'; exception when insufficient_privilege then null; end;
  update public.charts set name='hack' where id = cid; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: viewer updated without grant'; end if;
  update public.profiles set role='admin' where id = 'b0000000-0000-0000-0000-000000000003'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: viewer escalated role'; end if;
end $$;

-- ADMIN grants the viewer edit on that chart.
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001"}',true);
insert into public.resource_grants (tenant_id, resource_type, resource_id, principal_type, principal_id, permission)
values ('77777777-7777-7777-7777-777777777777','chart', current_setting('test.cid')::uuid, 'user','b0000000-0000-0000-0000-000000000003','edit');

-- VIEWER can now update THAT chart.
select set_config('request.jwt.claims','{"sub":"b0000000-0000-0000-0000-000000000003"}',true);
do $$
declare cid uuid := current_setting('test.cid')::uuid; n int;
begin
  update public.charts set name='ok-by-grant' where id = cid; get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: grant did not allow update'; end if;
end $$;

select 'PASS: RLS layer-2 roles + per-object grant + no escalation' as result;
rollback;
