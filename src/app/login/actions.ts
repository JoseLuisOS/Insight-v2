"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Intersel Insight is provisioned per-person, not self-registered — there is
 * no public signup. Accounts are created by an admin (see scripts/create_user.js),
 * with a temporary password and `app_metadata.must_change_password: true`.
 */
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.app_metadata?.must_change_password) {
    redirect("/change-password");
  }

  redirect("/dashboard");
}
