-- Ola 2: embed analytics — count public views per publication.
create table public.embed_views (
  id             bigint generated always as identity primary key,
  publication_id uuid not null references public.publications (id) on delete cascade,
  viewed_at      timestamptz not null default now()
);
create index embed_views_publication_id_idx on public.embed_views (publication_id);

grant select on public.embed_views to authenticated;
alter table public.embed_views enable row level security;

create policy members_read on public.embed_views for select to authenticated
  using (exists (
    select 1 from public.publications p
    where p.id = publication_id and p.tenant_id = app.current_tenant_id()
  ));

create or replace function public.log_publication_view(p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_pub uuid;
begin
  select id into v_pub from public.publications
  where publish_token = p_token
    and revoked_at is null
    and visibility in ('public_link','public_embed')
    and (expires_at is null or expires_at > now());
  if v_pub is not null then
    insert into public.embed_views (publication_id) values (v_pub);
  end if;
end;
$$;
revoke all on function public.log_publication_view(text) from public;
grant execute on function public.log_publication_view(text) to anon, authenticated;
