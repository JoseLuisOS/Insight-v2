-- Épica Publicación: anonymous public render. SECURITY DEFINER so it can read a
-- snapshot by token without any tenant/JWT context. It NEVER touches live data —
-- only the frozen snapshot (whose tenant was forced when it was generated).
-- The token is the only input; revoked publications return nothing.
create or replace function public.render_publication(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'visibility', pub.visibility,
           'generated_at', s.generated_at,
           'snapshot', s.data_json
         )
  from public.publications pub
  join lateral (
    select s.data_json, s.generated_at
    from public.snapshots s
    where s.publication_id = pub.id
    order by s.generated_at desc
    limit 1
  ) s on true
  where pub.publish_token = p_token
    and pub.revoked_at is null
    and pub.visibility in ('public_link', 'public_embed')
$$;

revoke all on function public.render_publication(text) from public;
grant execute on function public.render_publication(text) to anon, authenticated;
