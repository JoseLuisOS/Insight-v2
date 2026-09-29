"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function changePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    redirect(
      `/change-password?error=${encodeURIComponent("La contraseña debe tener al menos 8 caracteres.")}`,
    );
  }
  if (password !== confirmPassword) {
    redirect(
      `/change-password?error=${encodeURIComponent("Las contraseñas no coinciden.")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    redirect(`/change-password?error=${encodeURIComponent(updateError.message)}`);
  }

  // `app_metadata` isn't self-editable via `auth.updateUser` (by design —
  // it's the trusted side of the user record). Clearing the flag needs the
  // service-role Admin API, called here, server-side, after the password
  // update above has already succeeded.
  const admin = createAdminClient();
  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, must_change_password: false },
  });
  if (metaError) {
    redirect(`/change-password?error=${encodeURIComponent(metaError.message)}`);
  }

  const { data: status } = await supabase.rpc("get_org_bootstrap_status");
  if (status?.organization_count === 0 && status?.is_platform_admin) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
