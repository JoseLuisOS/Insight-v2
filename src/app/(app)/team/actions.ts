"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { removeMember, resetMemberPassword, setMemberStatus, updateMember } from "@/lib/insight-users";

export type CreateUserResult =
  | { ok: true; existing: boolean; tempPassword?: string }
  | { error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The RPCs raise Spanish messages meant for users; anything else is generic.
function friendly(message: string): string {
  const known = [
    "No tienes permiso",
    "Selecciona al menos",
    "Alguno de los roles",
    "Solo un Owner",
    "Ya es miembro",
    "El usuario no existe",
  ];
  return known.some((k) => message.startsWith(k)) ? message : "No se pudo crear el usuario.";
}

export async function createUser(input: {
  orgId: string;
  email: string;
  displayName: string;
  roleIds: string[];
  password: string;
}): Promise<CreateUserResult> {
  if (!input || typeof input.orgId !== "string" || typeof input.email !== "string" || typeof input.displayName !== "string" || !Array.isArray(input.roleIds) || input.roleIds.some((id) => typeof id !== "string") || typeof input.password !== "string") {
    return { error: "Datos del usuario inválidos." };
  }
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!EMAIL_RE.test(email)) return { error: "Correo inválido." };
  if (email === "sysadminodin@temikia.com") return { error: "La cuenta maestra no se administra desde Usuarios." };
  if (displayName.length < 2 || displayName.length > 100) return { error: "El nombre debe tener entre 2 y 100 caracteres." };
  if (input.roleIds.length === 0) return { error: "Selecciona al menos un rol." };

  const supabase = await createClient();
  const { data: orgs } = await supabase.rpc("list_invitable_orgs");
  if (!(orgs as { id: string }[] | null)?.some((o) => o.id === input.orgId)) {
    return { error: "No tienes permiso para crear usuarios en esta organización." };
  }

  const admin = createAdminClient();
  const { data: existingId } = await admin.rpc("find_auth_user_by_email", { p_email: email });

  let userId = existingId as string | null;
  let created = false;
  if (!userId) {
    if (input.password.length < 12) return { error: "La contraseña temporal debe tener al menos 12 caracteres." };
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      app_metadata: { must_change_password: true },
    });
    if (error || !data.user) return { error: "No se pudo crear la cuenta." };
    userId = data.user.id;
    created = true;
  }

  const { error } = await supabase.rpc("add_organization_member", {
    p_org: input.orgId,
    p_user_id: userId,
    p_display_name: displayName,
    p_role_ids: input.roleIds,
  });
  if (error) {
    if (created) await admin.auth.admin.deleteUser(userId);
    return { error: friendly(error.message) };
  }

  revalidatePath("/team");
  return created ? { ok: true, existing: false, tempPassword: input.password } : { ok: true, existing: true };
}

function actionError(error: unknown) {
  const message = error instanceof Error ? error.message : "No se pudo completar la operación.";
  return /^(Datos|Organización|Usuario|El usuario|Este estado|No puedes|No tienes|Solo |Alguno|La organización|Cambia tu|No se pudo)/.test(message) ? message : "No se pudo completar la operación.";
}

export async function updateTeamMember(input: { orgId: string; userId: string; displayName: string; roleIds: string[] }) {
  try { await updateMember(input); revalidatePath("/team"); return { ok: true as const }; }
  catch (error) { return { error: actionError(error) }; }
}

export async function changeTeamMemberStatus(input: { orgId: string; userId: string; active: boolean }) {
  try { await setMemberStatus(input.orgId, input.userId, input.active); revalidatePath("/team"); return { ok: true as const }; }
  catch (error) { return { error: actionError(error) }; }
}

export async function removeTeamMember(input: { orgId: string; userId: string }) {
  try { await removeMember(input.orgId, input.userId); revalidatePath("/team"); return { ok: true as const }; }
  catch (error) { return { error: actionError(error) }; }
}

export async function resetTeamMemberPassword(input: { orgId: string; userId: string }) {
  try { const password = await resetMemberPassword(input.orgId, input.userId); return { ok: true as const, password }; }
  catch (error) { return { error: actionError(error) }; }
}
