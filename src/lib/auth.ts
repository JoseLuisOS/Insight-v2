import { createClient } from "@/lib/supabase/server";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
};

export type Profile = {
  id: string;
  tenant_id: string;
  display_name: string | null;
  role: "admin" | "editor" | "viewer";
  can_publish: boolean;
  tenants: Tenant | null;
};

/** Loads the authenticated user and their profile (with tenant), if any. */
export async function getProfileContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null as Profile | null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tenant_id, display_name, role, can_publish, tenants(*)")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: (profile as Profile | null) ?? null };
}
