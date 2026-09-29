-- scripts/010_public_member_admin_rpc.sql
-- Member creation RPCs (spec: docs/superpowers/specs/2026-09-24-modulo-alta-usuarios-design.md).
-- Run with the ADMIN connection (same reason as scripts/007). Idempotent.

create or replace function public.iam_has_permission(p_org uuid, p_code text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_mid uuid; v_eff text;
begin
  if v_uid is null then return false; end if;
  if exists (select 1 from insight_iam.iam_platform_admins where user_id = v_uid) then return true; end if;
  select id into v_mid from insight_iam.iam_organization_memberships
   where organization_id = p_org and user_id = v_uid and status = 'active';
  if v_mid is null then return false; end if;
  select o.effect into v_eff from insight_iam.iam_user_permission_overrides o
    join insight_iam.iam_permissions p on p.id = o.permission_id
   where o.membership_id = v_mid and p.code = p_code;
  if v_eff is not null then return v_eff = 'allow'; end if;
  return exists (
    select 1 from insight_iam.iam_membership_roles mr
      join insight_iam.iam_role_permissions rp on rp.role_id = mr.role_id
      join insight_iam.iam_permissions p on p.id = rp.permission_id
     where mr.membership_id = v_mid and p.code = p_code);
end $$;

create or replace function public.list_invitable_orgs()
returns table (id uuid, name text) language sql stable security definer set search_path = '' as $$
  select o.id, o.name from insight_core.core_organizations o
   where o.status = 'active' and public.iam_has_permission(o.id, 'members.invite')
   order by o.name;
$$;

create or replace function public.list_org_roles(p_org uuid)
returns table (id uuid, code text, name text) language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.iam_has_permission(p_org, 'members.invite') or public.iam_has_permission(p_org, 'members.view')) then
    raise exception 'No tienes permiso para esta organización.';
  end if;
  return query select r.id, r.code, r.name from insight_iam.iam_roles r where r.organization_id = p_org order by r.name;
end $$;

create or replace function public.list_org_members(p_org uuid)
returns table (user_id uuid, email text, display_name text, status text, roles text[])
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.iam_has_permission(p_org, 'members.invite') or public.iam_has_permission(p_org, 'members.view')) then
    raise exception 'No tienes permiso para esta organización.';
  end if;
  return query
    select m.user_id, u.email::text, p.display_name, m.status,
           coalesce(array_agg(r.name order by r.name) filter (where r.id is not null), '{}')
      from insight_iam.iam_organization_memberships m
      join auth.users u on u.id = m.user_id
      left join insight_core.core_user_profiles p on p.user_id = m.user_id
      left join insight_iam.iam_membership_roles mr on mr.membership_id = m.id
      left join insight_iam.iam_roles r on r.id = mr.role_id
     where m.organization_id = p_org
     group by m.user_id, u.email, p.display_name, m.status, m.created_at
     order by m.created_at;
end $$;

create or replace function public.add_organization_member(
  p_org uuid, p_user_id uuid, p_display_name text, p_role_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_mid uuid; v_owner_role uuid;
begin
  if not public.iam_has_permission(p_org, 'members.invite') then
    raise exception 'No tienes permiso para crear usuarios en esta organización.';
  end if;
  if p_role_ids is null or cardinality(p_role_ids) = 0 then
    raise exception 'Selecciona al menos un rol.';
  end if;
  if exists (select 1 from unnest(p_role_ids) rid
              where not exists (select 1 from insight_iam.iam_roles r where r.id = rid and r.organization_id = p_org)) then
    raise exception 'Alguno de los roles no pertenece a la organización.';
  end if;
  select r.id into v_owner_role from insight_iam.iam_roles r where r.organization_id = p_org and r.code = 'owner';
  if v_owner_role = any (p_role_ids)
     and not exists (select 1 from insight_iam.iam_platform_admins where user_id = v_uid)
     and not exists (select 1 from insight_iam.iam_organization_memberships m
                       join insight_iam.iam_membership_roles mr on mr.membership_id = m.id
                      where m.organization_id = p_org and m.user_id = v_uid and m.status = 'active'
                        and mr.role_id = v_owner_role) then
    raise exception 'Solo un Owner puede asignar el rol Owner.';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'El usuario no existe.';
  end if;
  if exists (select 1 from insight_iam.iam_organization_memberships where organization_id = p_org and user_id = p_user_id) then
    raise exception 'Ya es miembro de esta organización.';
  end if;

  insert into insight_core.core_user_profiles (user_id, display_name)
  values (p_user_id, nullif(trim(p_display_name), ''))
  on conflict (user_id) do nothing;

  insert into insight_iam.iam_organization_memberships (organization_id, user_id, status, joined_at)
  values (p_org, p_user_id, 'active', now()) returning id into v_mid;
  insert into insight_iam.iam_membership_roles (membership_id, role_id)
  select v_mid, unnest(p_role_ids);
  return v_mid;
end $$;

create or replace function public.find_auth_user_by_email(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;

revoke execute on function public.iam_has_permission(uuid, text), public.list_invitable_orgs(),
  public.list_org_roles(uuid), public.list_org_members(uuid),
  public.add_organization_member(uuid, uuid, text, uuid[]), public.find_auth_user_by_email(text)
  from public, anon;
grant execute on function public.iam_has_permission(uuid, text), public.list_invitable_orgs(),
  public.list_org_roles(uuid), public.list_org_members(uuid),
  public.add_organization_member(uuid, uuid, text, uuid[]) to authenticated;
revoke execute on function public.find_auth_user_by_email(text) from authenticated;
grant execute on function public.find_auth_user_by_email(text) to service_role;
