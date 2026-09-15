-- Ola 3: semantic layer — reusable named metrics (agg over a dataset column).
create table public.metrics (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  dataset_id  uuid not null references public.datasets (id) on delete cascade,
  name        text not null,
  column_key  text not null,
  agg         text not null check (agg in ('sum','avg','count','min','max')),
  description text,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);
create index metrics_tenant_id_idx on public.metrics (tenant_id);
create index metrics_dataset_id_idx on public.metrics (dataset_id);

grant select, insert, update, delete on public.metrics to authenticated;
alter table public.metrics enable row level security;

create policy members_read on public.metrics for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy writers_all on public.metrics for all to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'))
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'));
