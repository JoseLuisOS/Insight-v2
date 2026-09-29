-- Transactional (rolls back). Run with --admin AFTER scripts/010.
begin;
do $$
declare
  org uuid; adm uuid := gen_random_uuid(); viewer uuid := gen_random_uuid(); newu uuid := gen_random_uuid();
  m uuid; r_admin uuid; r_viewer uuid; r_owner uuid; ok boolean;
begin
  select id into org from insight_core.core_organizations where slug = 'hermosillo-como-vamos';
  select id into r_admin from insight_iam.iam_roles where organization_id = org and code = 'administrator';
  select id into r_viewer from insight_iam.iam_roles where organization_id = org and code = 'viewer';
  select id into r_owner from insight_iam.iam_roles where organization_id = org and code = 'owner';
  insert into auth.users (id, email) values (adm, 't-adm@x.test'), (viewer, 't-view@x.test'), (newu, 't-new@x.test');
  insert into insight_iam.iam_organization_memberships (organization_id, user_id, status) values (org, adm, 'active') returning id into m;
  insert into insight_iam.iam_membership_roles values (m, r_admin);
  insert into insight_iam.iam_organization_memberships (organization_id, user_id, status) values (org, viewer, 'active') returning id into m;
  insert into insight_iam.iam_membership_roles values (m, r_viewer);
  set local role authenticated;

  perform set_config('request.jwt.claim.sub', viewer::text, true);
  begin
    perform public.add_organization_member(org, newu, 'N', array[r_viewer]);
    raise exception 'FAIL: viewer created user';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  perform set_config('request.jwt.claim.sub', adm::text, true);
  begin
    perform public.add_organization_member(org, newu, 'N', array[r_owner]);
    raise exception 'FAIL: admin assigned owner';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  perform public.add_organization_member(org, newu, 'N', array[r_viewer]);
  begin
    perform public.add_organization_member(org, newu, 'N', array[r_viewer]);
    raise exception 'FAIL: duplicate allowed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  -- a deny override beats the role grant
  reset role;
  insert into insight_iam.iam_user_permission_overrides (membership_id, permission_id, effect)
  select (select id from insight_iam.iam_organization_memberships where organization_id = org and user_id = adm),
         p.id, 'deny' from insight_iam.iam_permissions p where p.code = 'members.invite';
  set local role authenticated;
  select public.iam_has_permission(org, 'members.invite') into ok;
  if ok then raise exception 'FAIL: deny override ignored'; end if;
  raise notice 'PASS: member admin rules hold';
end $$;
rollback;
