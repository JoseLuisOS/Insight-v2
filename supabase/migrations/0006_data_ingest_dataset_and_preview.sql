-- Épica Datos: materialize an uploaded CSV / pasted table into a per-dataset
-- physical table in tenant_data, register it in public.datasets, and provide a
-- safe preview reader. Tenant is forced server-side; identifiers are quoted
-- with %I and column types validated against an allowlist (no SQL injection).

alter table public.datasets add column if not exists row_count integer not null default 0;

create or replace function public.ingest_dataset(p_name text, p_columns jsonb, p_rows jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid := app.current_tenant_id();
  v_dataset uuid := gen_random_uuid();
  v_tbl text := 'ds_' || replace(v_dataset::text, '-', '');
  v_col jsonb;
  v_key text;
  v_type text;
  v_coldefs text := '';
  v_collist text := '';
  v_vallist text := '';
  v_count int := 0;
  v_allowed text[] := array['text','integer','numeric','boolean','date','timestamptz'];
begin
  if v_uid is null or v_tenant is null then
    raise exception 'not authenticated or no tenant';
  end if;
  if p_columns is null or jsonb_array_length(p_columns) = 0 then
    raise exception 'no columns provided';
  end if;

  for v_col in select * from jsonb_array_elements(p_columns) loop
    v_key := v_col ->> 'key';
    v_type := lower(coalesce(v_col ->> 'type', ''));
    if v_key is null or v_key = '' then raise exception 'column key missing'; end if;
    if lower(v_key) = 'tenant_id' then raise exception 'reserved column name: tenant_id'; end if;
    if not (v_type = any(v_allowed)) then raise exception 'invalid column type: %', v_type; end if;
    v_coldefs := v_coldefs || format(', %I %s', v_key, v_type);
    v_collist := v_collist || format(', %I', v_key);
    v_vallist := v_vallist || format(', nullif(r->>%L, '''')::%s', v_key, v_type);
  end loop;

  execute format('create table tenant_data.%I (tenant_id uuid not null default %L%s)',
                 v_tbl, v_tenant, v_coldefs);
  execute format('alter table tenant_data.%I enable row level security', v_tbl);
  execute format('create policy tenant_isolation on tenant_data.%I for all to authenticated '
              || 'using (tenant_id = app.current_tenant_id()) '
              || 'with check (tenant_id = app.current_tenant_id())', v_tbl);
  execute format('grant select on tenant_data.%I to authenticated, app_readonly', v_tbl);
  execute format('create index on tenant_data.%I (tenant_id)', v_tbl);

  if p_rows is not null and jsonb_array_length(p_rows) > 0 then
    execute format('insert into tenant_data.%I (tenant_id%s) '
                || 'select %L::uuid%s from jsonb_array_elements($1) as r',
                v_tbl, v_collist, v_tenant, v_vallist) using p_rows;
    v_count := jsonb_array_length(p_rows);
  end if;

  insert into public.datasets (id, tenant_id, name, kind, physical_table, columns_json, row_count, created_by)
  values (v_dataset, v_tenant, coalesce(nullif(trim(p_name), ''), 'Dataset'),
          'csv_materialized', 'tenant_data.' || v_tbl, p_columns, v_count, v_uid);

  return v_dataset;
end;
$$;

revoke all on function public.ingest_dataset(text, jsonb, jsonb) from public;
grant execute on function public.ingest_dataset(text, jsonb, jsonb) to authenticated;

create or replace function public.dataset_preview(p_dataset_id uuid, p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := app.current_tenant_id();
  v_tbl text;
  v_ds_tenant uuid;
  v_result jsonb;
begin
  select physical_table, tenant_id into v_tbl, v_ds_tenant
  from public.datasets where id = p_dataset_id;
  if v_tbl is null then raise exception 'dataset not found'; end if;
  if v_ds_tenant is distinct from v_tenant then raise exception 'forbidden'; end if;

  execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from '
              || '(select * from %s where tenant_id = %L limit %s) t',
              v_tbl, v_tenant, greatest(1, least(coalesce(p_limit, 50), 1000)))
    into v_result;
  return v_result;
end;
$$;

revoke all on function public.dataset_preview(uuid, int) from public;
grant execute on function public.dataset_preview(uuid, int) to authenticated;
