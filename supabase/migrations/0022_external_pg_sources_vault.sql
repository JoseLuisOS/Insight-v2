-- External Postgres as a read-only import source. Connection strings are stored
-- in Supabase Vault (encrypted), referenced by id from data_sources.config_json.
-- Only admins manage sources; only service_role can decrypt (import Edge Function).

create or replace function public.store_external_source(p_name text, p_conn text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid := app.current_tenant_id(); v_secret uuid; v_ds uuid;
begin
  if v_tenant is null then raise exception 'no tenant'; end if;
  if app.current_user_role() <> 'admin' then raise exception 'only admins can add data sources'; end if;
  if coalesce(trim(p_conn), '') = '' then raise exception 'empty connection string'; end if;

  v_secret := vault.create_secret(
    p_conn,
    'extpg_' || replace(gen_random_uuid()::text, '-', ''),
    'External Postgres connection for tenant ' || v_tenant::text
  );

  insert into public.data_sources (tenant_id, type, name, config_json, created_by)
  values (v_tenant, 'external_pg', coalesce(nullif(trim(p_name), ''), 'Postgres externo'),
          jsonb_build_object('secret_id', v_secret), auth.uid())
  returning id into v_ds;
  return v_ds;
end;
$$;
revoke all on function public.store_external_source(text, text) from public;
grant execute on function public.store_external_source(text, text) to authenticated;

create or replace function public.delete_external_source(p_data_source_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_secret uuid;
begin
  select tenant_id, (config_json ->> 'secret_id')::uuid into v_tenant, v_secret
  from public.data_sources where id = p_data_source_id;
  if v_tenant is null or v_tenant is distinct from app.current_tenant_id()
     or app.current_user_role() <> 'admin' then
    raise exception 'forbidden';
  end if;
  delete from public.data_sources where id = p_data_source_id;
  if v_secret is not null then delete from vault.secrets where id = v_secret; end if;
end;
$$;
revoke all on function public.delete_external_source(uuid) from public;
grant execute on function public.delete_external_source(uuid) to authenticated;

-- Decrypt a Vault secret — ONLY service_role (used by the import Edge Function).
create or replace function public.read_vault_secret(p_id uuid)
returns text language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where id = p_id
$$;
revoke all on function public.read_vault_secret(uuid) from public;
grant execute on function public.read_vault_secret(uuid) to service_role;

-- Edge Function `import-external` (in supabase/functions/) connects to the external
-- DB, runs a single SELECT (LIMIT + statement_timeout), and materializes the
-- result via ingest_dataset under the calling user.
