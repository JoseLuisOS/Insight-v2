-- Ola 3: data-level RLS — restrict which rows of a dataset a user/role can see.
-- Enforced in the read path (fetchDatasetData) for non-admins; admins see all.
create table public.dataset_row_policies (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  dataset_id     uuid not null references public.datasets (id) on delete cascade,
  column_key     text not null,
  principal_type text not null check (principal_type in ('user','role')),
  principal_id   text not null,
  allowed_value  text not null,
  created_at     timestamptz not null default now()
);
create index dataset_row_policies_dataset_idx on public.dataset_row_policies (dataset_id);
create index dataset_row_policies_tenant_idx on public.dataset_row_policies (tenant_id);

grant select, insert, update, delete on public.dataset_row_policies to authenticated;
alter table public.dataset_row_policies enable row level security;

create policy members_read on public.dataset_row_policies for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy admin_write on public.dataset_row_policies for all to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() = 'admin')
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() = 'admin');
