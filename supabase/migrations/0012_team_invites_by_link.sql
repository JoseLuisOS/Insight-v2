-- Team invites via shareable link (no email/SMTP). An admin creates an invite
-- (token + role); an invited user who has signed up opens /join/<token> and is
-- attached to the tenant with that role via accept_invite (SECURITY DEFINER).

create table public.tenant_invites (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  token       text not null unique,
  role        text not null check (role in ('admin','editor','viewer')),
  created_by  uuid references auth.users (id),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id),
  created_at  timestamptz not null default now()
);
create index tenant_invites_tenant_id_idx on public.tenant_invites (tenant_id);

grant select, insert, update, delete on public.tenant_invites to authenticated;
alter table public.tenant_invites enable row level security;

create policy members_read on public.tenant_invites for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy admin_write on public.tenant_invites for all to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() = 'admin')
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() = 'admin');

create or replace function public.get_invite(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'valid', (inv.accepted_at is null and inv.expires_at > now()),
    'tenant_name', t.name,
    'role', inv.role
  )
  from public.tenant_invites inv
  join public.tenants t on t.id = inv.tenant_id
  where inv.token = p_token
$$;
revoke all on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.tenant_invites%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'user already belongs to an organization';
  end if;

  select * into v_inv from public.tenant_invites
  where token = p_token and accepted_at is null and expires_at > now();
  if not found then raise exception 'invalid or expired invite'; end if;

  insert into public.profiles (id, tenant_id, role, can_publish)
  values (v_uid, v_inv.tenant_id, v_inv.role, v_inv.role = 'admin');

  update public.tenant_invites set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
  return v_inv.tenant_id;
end;
$$;
revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;
