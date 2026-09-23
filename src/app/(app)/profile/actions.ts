"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateOwnPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    redirect(`/profile?error=${encodeURIComponent("La contraseña debe tener al menos 8 caracteres.")}`);
  }
  if (password !== confirmPassword) {
    redirect(`/profile?error=${encodeURIComponent("Las contraseñas no coinciden.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/profile?success=password");
}
