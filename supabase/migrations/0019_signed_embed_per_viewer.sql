-- Ola 3: signed per-viewer embeds. Each publication gets a secret; the publisher
-- signs a filter payload (HMAC-SHA256); the public render verifies the signature
-- so the viewer can't tamper with their data scope.
alter table public.publications
  add column if not exists embed_secret text not null default encode(extensions.gen_random_bytes(16), 'hex');

create or replace function public.sign_embed_params(p_publication_id uuid, p_payload text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_secret text;
begin
  select tenant_id, embed_secret into v_tenant, v_secret
  from public.publications where id = p_publication_id;
  if v_tenant is null or v_tenant is distinct from app.current_tenant_id() then
    raise exception 'forbidden';
  end if;
  return encode(extensions.hmac(p_payload, v_secret, 'sha256'), 'hex');
end;
$$;
revoke all on function public.sign_embed_params(uuid, text) from public;
grant execute on function public.sign_embed_params(uuid, text) to authenticated;

create or replace function public.verify_embed_signature(p_token text, p_payload text, p_sig text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.publications pub
    where pub.publish_token = p_token
      and pub.revoked_at is null
      and pub.visibility in ('public_link','public_embed')
      and encode(extensions.hmac(p_payload, pub.embed_secret, 'sha256'), 'hex') = p_sig
  )
$$;
revoke all on function public.verify_embed_signature(text, text, text) from public;
grant execute on function public.verify_embed_signature(text, text, text) to anon, authenticated;
