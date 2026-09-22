import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS and can call the Auth Admin API
 * (create users, update app_metadata, etc.).
 *
 * SERVER-ONLY. Never import this from a Client Component or route that
 * forwards the client to the browser — it holds `SUPABASE_SERVICE_ROLE_KEY`.
 * Use it only from Server Actions / Route Handlers for specific trusted
 * operations (e.g. clearing the `must_change_password` flag after a user
 * sets their own password — that flag lives in `app_metadata`, which a user
 * cannot update on themselves via `auth.updateUser`).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
