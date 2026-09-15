-- RLS Layer 2: differentiate writes by role on top of Layer-1 tenant isolation.
-- Members (any role) read; editors/admins write; per-object edit grants override
-- for charts/dashboards. Profiles & grants are admin-managed.

-- ---- datasets ----
drop policy if exists tenant_isolation on public.datasets;
create policy members_read on public.datasets for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy writers_insert on public.datasets for insert to authenticated
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'));
create policy writers_update on public.datasets for update to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'))
  with check (tenant_id = app.current_tenant_id());
create policy writers_delete on public.datasets for delete to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'));

-- ---- data_sources ----
drop policy if exists tenant_isolation on public.data_sources;
create policy members_read on public.data_sources for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy writers_all on public.data_sources for all to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'))
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'));

-- ---- charts (with per-object edit grant override) ----
drop policy if exists tenant_isolation on public.charts;
create policy members_read on public.charts for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy writers_insert on public.charts for insert to authenticated
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'));
create policy writers_update on public.charts for update to authenticated
  using (
    tenant_id = app.current_tenant_id() and (
      app.current_user_role() in ('admin','editor')
      or exists (select 1 from public.resource_grants g
                 where g.resource_type='chart' and g.resource_id = charts.id
                   and g.principal_type='user' and g.principal_id = auth.uid()::text
                   and g.permission='edit')
    )
  )
  with check (tenant_id = app.current_tenant_id());
create policy writers_delete on public.charts for delete to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'));

-- ---- dashboards (with per-object edit grant override) ----
drop policy if exists tenant_isolation on public.dashboards;
create policy members_read on public.dashboards for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy writers_insert on public.dashboards for insert to authenticated
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'));
create policy writers_update on public.dashboards for update to authenticated
  using (
    tenant_id = app.current_tenant_id() and (
      app.current_user_role() in ('admin','editor')
      or exists (select 1 from public.resource_grants g
                 where g.resource_type='dashboard' and g.resource_id = dashboards.id
                   and g.principal_type='user' and g.principal_id = auth.uid()::text
                   and g.permission='edit')
    )
  )
  with check (tenant_id = app.current_tenant_id());
create policy writers_delete on public.dashboards for delete to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'));

-- ---- dashboard_items ----
drop policy if exists tenant_isolation on public.dashboard_items;
create policy members_read on public.dashboard_items for select to authenticated
  using (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.tenant_id = app.current_tenant_id()));
create policy writers_all on public.dashboard_items for all to authenticated
  using (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.tenant_id = app.current_tenant_id())
         and app.current_user_role() in ('admin','editor'))
  with check (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.tenant_id = app.current_tenant_id())
         and app.current_user_role() in ('admin','editor'));

-- ---- dashboard_filters ----
drop policy if exists tenant_isolation on public.dashboard_filters;
create policy members_read on public.dashboard_filters for select to authenticated
  using (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.tenant_id = app.current_tenant_id()));
create policy writers_all on public.dashboard_filters for all to authenticated
  using (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.tenant_id = app.current_tenant_id())
         and app.current_user_role() in ('admin','editor'))
  with check (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.tenant_id = app.current_tenant_id())
         and app.current_user_role() in ('admin','editor'));

-- ---- profiles (admin-managed) ----
drop policy if exists tenant_isolation on public.profiles;
create policy members_read on public.profiles for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy admin_write on public.profiles for all to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() = 'admin')
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() = 'admin');

-- ---- resource_grants (admin-managed) ----
drop policy if exists tenant_isolation on public.resource_grants;
create policy members_read on public.resource_grants for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy admin_write on public.resource_grants for all to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() = 'admin')
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() = 'admin');
