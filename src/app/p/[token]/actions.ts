"use server";

import { createClient } from "@/lib/supabase/server";

/** Anonymous fetch of a password-protected publication's snapshot. */
export async function fetchPublicSnapshot(
  token: string,
  password: string,
): Promise<{ payload: unknown } | { error: string }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("render_publication", {
    p_token: token,
    p_password: password,
  });
  if (!data || !(data as { snapshot?: unknown }).snapshot) {
    return { error: "Contraseña incorrecta o contenido no disponible." };
  }
  await supabase.rpc("log_publication_view", { p_token: token }); // analytics
  return { payload: data };
}
