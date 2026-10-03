-- One installation-wide master account. Run with --admin: auth.users is read below.
begin;

do $$
declare
  v_master uuid;
  v_jose uuid;
  v_table record;
  v_count bigint;
begin
  select id into strict v_master from auth.users
    where lower(email) = 'sysadminodin@temikia.com';
  select id into strict v_jose from auth.users
    where lower(email) = 'joseluis.o.santana@hotmail.com';

  if (select count(*) from insight_iam.iam_platform_admins) <> 1
     or not exists (select 1 from insight_iam.iam_platform_admins
                    where user_id = v_master and role = 'sysadmin') then
    raise exception 'El sysadmin actual no coincide con la cuenta maestra esperada.';
  end if;
  if not exists (select 1 from insight_iam.iam_organization_memberships
                 where organization_id = '3db52b3a-c042-4e6e-9bca-77a6f428fd5a'
                   and user_id = v_jose and status = 'active') then
    raise exception 'Jose Luis no es miembro activo de la organización que se conservará.';
  end if;
  if not exists (select 1 from insight_core.core_organizations
                 where id = '00000000-0000-0000-0000-000000000001'
                   and slug = 'hermosillo-como-vamos') then
    raise exception 'No se encontró la organización inicial esperada.';
  end if;

  -- The duplicate may only contain its bootstrap membership and roles.
  if exists (select 1 from insight_iam.iam_organization_memberships
             where organization_id = '00000000-0000-0000-0000-000000000001'
               and user_id <> v_master) then
    raise exception 'La organización inicial tiene miembros que requieren revisión.';
  end if;
  for v_table in
    select table_schema, table_name from information_schema.columns
    where column_name = 'organization_id'
      and table_schema in ('insight_core', 'insight_iam', 'insight_survey', 'public')
      and table_name not in ('iam_roles', 'iam_organization_memberships')
  loop
    execute format('select count(*) from %I.%I where organization_id = $1',
                   v_table.table_schema, v_table.table_name)
      into v_count using '00000000-0000-0000-0000-000000000001'::uuid;
    if v_count > 0 then
      raise exception 'La organización inicial tiene datos en %.%.',
        v_table.table_schema, v_table.table_name;
    end if;
  end loop;

  delete from insight_iam.iam_organization_memberships where user_id = v_master;
  delete from insight_core.core_organizations
    where id = '00000000-0000-0000-0000-000000000001';
end $$;

-- The role is global. Organization roles may never use this reserved code.
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'insight_iam.iam_platform_admins'::regclass
                 and conname = 'iam_platform_admins_single_role') then
    alter table insight_iam.iam_platform_admins
      add constraint iam_platform_admins_single_role unique (role);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'insight_iam.iam_roles'::regclass
                 and conname = 'iam_roles_no_sysadmin') then
    alter table insight_iam.iam_roles
      add constraint iam_roles_no_sysadmin check (code <> 'sysadmin');
  end if;
end $$;

create or replace function insight_iam.guard_platform_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'La cuenta maestra no se elimina desde operaciones ordinarias.';
  end if;
  if tg_op = 'UPDATE' and (new.user_id <> old.user_id or new.role <> old.role) then
    raise exception 'La identidad y el rol de la cuenta maestra son inmutables.';
  end if;
  if not exists (select 1 from auth.users u where u.id = new.user_id
                 and lower(u.email) = 'sysadminodin@temikia.com') then
    raise exception 'sysadmin solo puede asignarse a la cuenta maestra.';
  end if;
  if exists (select 1 from insight_iam.iam_organization_memberships m
             where m.user_id = new.user_id) then
    raise exception 'La cuenta maestra no puede tener membresías de organización.';
  end if;
  return new;
end $$;

drop trigger if exists guard_platform_admin on insight_iam.iam_platform_admins;
create trigger guard_platform_admin before insert or update or delete
on insight_iam.iam_platform_admins for each row
execute function insight_iam.guard_platform_admin();

create or replace function insight_iam.guard_master_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from insight_iam.iam_platform_admins a
             where a.user_id = new.user_id and a.role = 'sysadmin') then
    raise exception 'La cuenta maestra queda fuera de las membresías de organización.';
  end if;
  return new;
end $$;

drop trigger if exists guard_master_membership on insight_iam.iam_organization_memberships;
create trigger guard_master_membership before insert or update of user_id
on insight_iam.iam_organization_memberships for each row
execute function insight_iam.guard_master_membership();

revoke execute on function insight_iam.guard_platform_admin(),
  insight_iam.guard_master_membership() from public, anon, authenticated;

-- Keep legacy memberships from exposing any platform administrator in Usuarios.
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
       and not exists (select 1 from insight_iam.iam_platform_admins a where a.user_id = m.user_id)
     group by m.user_id, u.email, p.display_name, m.status, m.created_at
     order by m.created_at;
end $$;

commit;
