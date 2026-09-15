"use server";

import { revalidatePath } from "next/cache";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createTheme(
  name: string,
  palette: string[],
): Promise<{ ok: true } | { error: string }> {
  const { profile } = await getProfileContext();
  if (!profile) return { error: "Sesión no válida." };
  const clean = palette.map((c) => c.trim()).filter((c) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c));
  if (clean.length === 0) return { error: "Agrega al menos un color hex válido." };

  const supabase = await createClient();
  const { error } = await supabase.from("themes").insert({
    tenant_id: profile.tenant_id,
    name: name.trim() || "Tema",
    config_json: { palette: clean },
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/themes");
  return { ok: true };
}

export async function deleteTheme(themeId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("themes").delete().eq("id", themeId);
  revalidatePath("/themes");
}
