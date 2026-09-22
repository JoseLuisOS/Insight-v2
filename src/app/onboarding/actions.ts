"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Bootstraps the installation's very first organization. The rule (not just
 * enforced here — public.bootstrap_first_organization() checks it too):
 * only a platform admin, and only when none exist yet. Organizations are
 * otherwise admin-assigned, never self-service (see docs/LOG.md 2026-09-22).
 */
export async function createFirstOrganization(formData: FormData) {
  const name = String(formData.get("organization_name") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("bootstrap_first_organization", {
    p_name: name,
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
