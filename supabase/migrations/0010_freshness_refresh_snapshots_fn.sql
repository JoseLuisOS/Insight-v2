-- Épica Frescura: regenerate snapshots for live public chart publications backed
-- by materialized datasets. No arbitrary SQL — physical_table is a trusted value
-- we generated. Tenant is forced via the publication row. Run by pg_cron.
create or replace function public.refresh_due_snapshots()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_rows jsonb;
  v_cols jsonb;
  n int := 0;
begin
  for r in
    select pub.id as pub_id, pub.tenant_id, c.name, c.config_json, d.physical_table, d.columns_json
    from public.publications pub
    join public.charts c on c.id = pub.resource_id and pub.resource_type = 'chart'
    join public.datasets d on d.id = c.dataset_id
    where pub.revoked_at is null
      and pub.visibility in ('public_link', 'public_embed')
      and d.physical_table is not null
  loop
    execute format(
      'select coalesce(jsonb_agg(t), ''[]''::jsonb) from (select * from %s where tenant_id = %L limit 5000) t',
      r.physical_table, r.tenant_id
    ) into v_rows;

    select coalesce(jsonb_agg(c ->> 'key'), '[]'::jsonb) into v_cols
    from jsonb_array_elements(r.columns_json) c;

    insert into public.snapshots (publication_id, data_json)
    values (
      r.pub_id,
      jsonb_build_object('kind', 'chart', 'name', r.name, 'config', r.config_json,
                         'columns', v_cols, 'rows', v_rows)
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.refresh_due_snapshots() from public;
