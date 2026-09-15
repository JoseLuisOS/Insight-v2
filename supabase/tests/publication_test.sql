-- Intersel Insight — anonymous publication render test. Transaction + ROLLBACK.
-- Verifies the public path serves a frozen snapshot by token and blocks unknown
-- and revoked publications. Expected final row: "PASS: ...".

begin;
insert into public.tenants (id, name, slug) values ('88888888-8888-8888-8888-888888888888','Pub Co','pub-co');
insert into public.publications (id, tenant_id, resource_type, resource_id, visibility, publish_token)
values ('99999999-9999-9999-9999-999999999999','88888888-8888-8888-8888-888888888888','chart',
        '88888888-8888-8888-8888-888888888888','public_embed','tok_abc123');
insert into public.snapshots (publication_id, data_json)
values ('99999999-9999-9999-9999-999999999999',
        '{"kind":"chart","name":"Ventas","config":{"type":"bar"},"columns":["mes"],"rows":[{"mes":"Ene"}]}'::jsonb);

set local role anon;
select set_config('request.jwt.claims', '', true);
do $$
begin
  if public.render_publication('tok_abc123') is null then raise exception 'FAIL: valid token null'; end if;
  if (public.render_publication('tok_abc123'))->'snapshot'->>'name' <> 'Ventas' then raise exception 'FAIL: wrong data'; end if;
  if public.render_publication('nope') is not null then raise exception 'FAIL: unknown token returned data'; end if;
end $$;

set local role postgres;
update public.publications set revoked_at = now() where publish_token = 'tok_abc123';
set local role anon;
do $$
begin
  if public.render_publication('tok_abc123') is not null then raise exception 'FAIL: revoked still readable'; end if;
end $$;

select 'PASS: anonymous render serves snapshot, blocks unknown + revoked' as result;
rollback;
