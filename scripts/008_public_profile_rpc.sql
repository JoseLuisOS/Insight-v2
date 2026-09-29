-- scripts/008_public_profile_rpc.sql
-- Intersel Insight — public-schema RPC shims for self-service profile
-- management (name, avatar_url). Same reason as scripts/007: insight_core
-- isn't exposed via the Data API, so anything the frontend needs from
-- insight_core.core_user_profiles has to go through `public`.
--
-- Unlike scripts/007's functions, these use SECURITY INVOKER, not DEFINER:
-- there's no privilege to bypass here. `authenticated` already has
-- SELECT/INSERT/UPDATE/DELETE on insight_core.core_user_profiles (scripts/006)
-- and RLS policy `own_profile` already restricts it to the caller's own
-- row — the function body doesn't need to re-implement that check, it
-- inherits it by running as the calling role.
--
-- Run with --admin: public functions are owned by postgres. Email comes from
-- auth.getUser() in the client, not from this SQL.

set search_path = insight_survey, insight_core, insight_iam, public;

create or replace function public.get_my_profile()
returns table (display_name text, avatar_url text)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.display_name, p.avatar_url
  from insight_core.core_user_profiles p
  where p.user_id = (select auth.uid());
$$;

create or replace function public.update_my_profile(p_display_name text, p_avatar_url text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into insight_core.core_user_profiles (user_id, display_name, avatar_url, updated_at)
  values ((select auth.uid()), p_display_name, p_avatar_url, now())
  on conflict (user_id) do update
    set display_name = p_display_name,
        avatar_url = coalesce(p_avatar_url, insight_core.core_user_profiles.avatar_url),
        updated_at = now();
end;
$$;

revoke execute on function public.get_my_profile() from public, anon;
revoke execute on function public.update_my_profile(text, text) from public, anon;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.update_my_profile(text, text) to authenticated;
