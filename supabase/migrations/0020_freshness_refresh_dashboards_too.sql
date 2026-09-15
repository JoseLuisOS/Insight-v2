-- Extend refresh_due_snapshots to also rebuild dashboard snapshots (items backed
-- by materialized datasets). The existing 'refresh-snapshots-hourly' cron calls it.
create or replace function public.refresh_due_snapshots()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  it record;
  v_rows jsonb;
  v_cols jsonb;
  v_items jsonb;
  v_filters jsonb;
  n int := 0;
begin
  -- Charts
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
      r.physical_table, r.tenant_id) into v_rows;
    select coalesce(jsonb_agg(c ->> 'key'), '[]'::jsonb) into v_cols
      from jsonb_array_elements(r.columns_json) c;
    insert into public.snapshots (publication_id, data_json)
    values (r.pub_id, jsonb_build_object('kind','chart','name',r.name,'config',r.config_json,'columns',v_cols,'rows',v_rows));
    n := n + 1;
  end loop;

  -- Dashboards
  for r in
    select pub.id as pub_id, pub.tenant_id, d.id as dash_id, d.name
    from public.publications pub
    join public.dashboards d on d.id = pub.resource_id and pub.resource_type = 'dashboard'
    where pub.revoked_at is null
      and pub.visibility in ('public_link', 'public_embed')
  loop
    v_items := '[]'::jsonb;
    for it in
      select di.id, c.name, c.config_json, di.layout_json, ds.physical_table, ds.columns_json
      from public.dashboard_items di
      join public.charts c on c.id = di.chart_id
      join public.datasets ds on ds.id = c.dataset_id
      where di.dashboard_id = r.dash_id and ds.physical_table is not null
    loop
      execute format(
        'select coalesce(jsonb_agg(t), ''[]''::jsonb) from (select * from %s where tenant_id = %L limit 5000) t',
        it.physical_table, r.tenant_id) into v_rows;
      select coalesce(jsonb_agg(c ->> 'key'), '[]'::jsonb) into v_cols
        from jsonb_array_elements(it.columns_json) c;
      v_items := v_items || jsonb_build_object(
        'id', it.id, 'name', it.name, 'config', it.config_json,
        'layout', it.layout_json, 'columns', v_cols, 'rows', v_rows);
    end loop;

    select coalesce(jsonb_agg(jsonb_build_object('id', df.id, 'type', df.type, 'config', df.config_json)), '[]'::jsonb)
      into v_filters from public.dashboard_filters df where df.dashboard_id = r.dash_id;

    insert into public.snapshots (publication_id, data_json)
    values (r.pub_id, jsonb_build_object('kind','dashboard','name',r.name,'items',v_items,'filters',v_filters));
    n := n + 1;
  end loop;

  return n;
end;
$$;
revoke all on function public.refresh_due_snapshots() from public;
