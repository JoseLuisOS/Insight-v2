"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createTenant(formData: FormData) {
  const tenantName = String(formData.get("tenant_name") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("bootstrap_tenant", {
    p_tenant_name: tenantName,
    p_display_name: displayName || null,
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  // Refresh the session so a newly-minted token carries tenant claims
  // (when the access token hook is enabled). RLS already works via the
  // profile fallback regardless.
  await supabase.auth.refreshSession();

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
