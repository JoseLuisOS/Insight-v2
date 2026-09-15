-- bootstrap_tenant must be callable via PostgREST RPC, which only sees `public`.
drop function if exists app.bootstrap_tenant(text, text);

create or replace function public.bootstrap_tenant(p_tenant_name text, p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid;
  v_slug text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'user already onboarded';
  end if;
  v_slug := lower(regexp_replace(coalesce(nullif(trim(p_tenant_name), ''), 'tenant'),
                                 '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'tenant'; end if;
  v_slug := v_slug || '-' || substr(replace(v_uid::text, '-', ''), 1, 6);
  insert into public.tenants (name, slug)
  values (coalesce(nullif(trim(p_tenant_name), ''), 'Mi organización'), v_slug)
  returning id into v_tenant;
  insert into public.profiles (id, tenant_id, display_name, role, can_publish)
  values (v_uid, v_tenant, nullif(trim(p_display_name), ''), 'admin', true);
  return v_tenant;
end;
$$;

revoke all on function public.bootstrap_tenant(text, text) from public;
grant execute on function public.bootstrap_tenant(text, text) to authenticated;
