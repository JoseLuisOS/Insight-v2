-- Make RLS helpers resilient: read tenant/role/can_publish from the JWT claim
-- (fast path, set by the access token hook when enabled) OR fall back to the
-- caller's own profile row. SECURITY DEFINER lets the profile lookup bypass RLS,
-- which also avoids infinite recursion with profiles' own policy. This removes
-- the hard dependency on enabling the auth hook for the app to function.

create or replace function app.current_tenant_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    nullif(coalesce(
      app.current_claims() -> 'app_metadata' ->> 'tenant_id',
      app.current_claims() ->> 'tenant_id'
    ), '')::uuid,
    (select p.tenant_id from public.profiles p where p.id = auth.uid())
  )
$$;

create or replace function app.current_user_role()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    nullif(coalesce(
      app.current_claims() -> 'app_metadata' ->> 'role',
      app.current_claims() ->> 'user_role'
    ), ''),
    (select p.role from public.profiles p where p.id = auth.uid()),
    'viewer'
  )
$$;

create or replace function app.current_can_publish()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (app.current_claims() -> 'app_metadata' ->> 'can_publish')::boolean,
    (select p.can_publish from public.profiles p where p.id = auth.uid()),
    false
  )
$$;
