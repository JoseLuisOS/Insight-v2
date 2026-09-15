-- Ola 2: reusable themes (saved palettes) at the tenant level.
create table public.themes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  name        text not null,
  config_json jsonb not null default '{}'::jsonb,  -- { palette: string[] }
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);
create index themes_tenant_id_idx on public.themes (tenant_id);

grant select, insert, update, delete on public.themes to authenticated;
alter table public.themes enable row level security;

create policy members_read on public.themes for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy writers_all on public.themes for all to authenticated
  using (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'))
  with check (tenant_id = app.current_tenant_id() and app.current_user_role() in ('admin','editor'));
