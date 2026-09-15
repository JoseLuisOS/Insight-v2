-- Ola 1: embed personalization + link expiration/password on publications.
create extension if not exists pgcrypto with schema extensions;

alter table public.publications add column if not exists expires_at timestamptz;
alter table public.publications add column if not exists password_hash text;

-- Replace the 1-arg render with a 2-arg version (password optional). Dropping
-- the old one keeps single-arg calls unambiguous.
drop function if exists public.render_publication(text);

create or replace function public.render_publication(p_token text, p_password text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'visibility', pub.visibility,
           'generated_at', s.generated_at,
           'settings', pub.settings_json,
           'snapshot', s.data_json
         )
  from public.publications pub
  join lateral (
    select s.data_json, s.generated_at
    from public.snapshots s
    where s.publication_id = pub.id
    order by s.generated_at desc
    limit 1
  ) s on true
  where pub.publish_token = p_token
    and pub.revoked_at is null
    and pub.visibility in ('public_link', 'public_embed')
    and (pub.expires_at is null or pub.expires_at > now())
    and (
      pub.password_hash is null
      or (p_password is not null and extensions.crypt(p_password, pub.password_hash) = pub.password_hash)
    )
$$;
revoke all on function public.render_publication(text, text) from public;
grant execute on function public.render_publication(text, text) to anon, authenticated;

create or replace function public.get_publication_meta(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'exists', true,
    'requires_password', pub.password_hash is not null,
    'available', (pub.revoked_at is null and (pub.expires_at is null or pub.expires_at > now())),
    'name', s.data_json ->> 'name'
  )
  from public.publications pub
  left join lateral (
    select s.data_json from public.snapshots s
    where s.publication_id = pub.id order by s.generated_at desc limit 1
  ) s on true
  where pub.publish_token = p_token
    and pub.visibility in ('public_link', 'public_embed')
$$;
revoke all on function public.get_publication_meta(text) from public;
grant execute on function public.get_publication_meta(text) to anon, authenticated;

create or replace function public.set_publication_password(p_publication_id uuid, p_password text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  select tenant_id into v_tenant from public.publications where id = p_publication_id;
  if v_tenant is null or v_tenant is distinct from app.current_tenant_id() then
    raise exception 'forbidden';
  end if;
  if p_password is null or length(trim(p_password)) = 0 then
    update public.publications set password_hash = null where id = p_publication_id;
  else
    update public.publications
    set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
    where id = p_publication_id;
  end if;
end;
$$;
revoke all on function public.set_publication_password(uuid, text) from public;
grant execute on function public.set_publication_password(uuid, text) to authenticated;
