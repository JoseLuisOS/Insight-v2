-- Ola 1: textual annotations attached to charts.
create table public.annotations (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  chart_id   uuid not null references public.charts (id) on delete cascade,
  body       text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index annotations_chart_id_idx on public.annotations (chart_id);
create index annotations_tenant_id_idx on public.annotations (tenant_id);

grant select, insert, update, delete on public.annotations to authenticated;
alter table public.annotations enable row level security;

create policy members_read on public.annotations for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy writers_insert on public.annotations for insert to authenticated
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'));
create policy writers_delete on public.annotations for delete to authenticated
  using (tenant_id = app.current_tenant_id()
         and (app.current_user_role() in ('admin','editor') or created_by = auth.uid()));
