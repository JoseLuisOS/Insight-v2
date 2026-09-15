"use server";

import { revalidatePath } from "next/cache";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addAnnotation(
  chartId: string,
  body: string,
): Promise<{ ok: true } | { error: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "La nota está vacía." };
  const { profile } = await getProfileContext();
  if (!profile) return { error: "Sesión no válida." };

  const supabase = await createClient();
  const { error } = await supabase.from("annotations").insert({
    tenant_id: profile.tenant_id,
    chart_id: chartId,
    body: trimmed,
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/charts/${chartId}`);
  return { ok: true };
}

export async function deleteAnnotation(
  annotationId: string,
  chartId: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("annotations").delete().eq("id", annotationId);
  revalidatePath(`/charts/${chartId}`);
}
