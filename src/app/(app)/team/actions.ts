"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createInvite(
  role: "admin" | "editor" | "viewer",
): Promise<{ token: string } | { error: string }> {
  const { profile } = await getProfileContext();
  if (!profile) return { error: "Sesión no válida." };

  const supabase = await createClient();
  const token = randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("tenant_invites").insert({
    tenant_id: profile.tenant_id,
    token,
    role,
    created_by: profile.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/team");
  return { token };
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("tenant_invites").delete().eq("id", inviteId);
  revalidatePath("/team");
}

export async function updateMember(
  profileId: string,
  role: "admin" | "editor" | "viewer",
  canPublish: boolean,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  // RLS (admin_write on profiles) ensures only an admin of the tenant can do this.
  const { error } = await supabase
    .from("profiles")
    .update({ role, can_publish: canPublish })
    .eq("id", profileId);

  if (error) return { error: error.message };
  revalidatePath("/team");
  return { ok: true };
}
