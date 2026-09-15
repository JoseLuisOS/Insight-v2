"use server";

import { revalidatePath } from "next/cache";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createMetric(input: {
  datasetId: string;
  name: string;
  columnKey: string;
  agg: "sum" | "avg" | "count" | "min" | "max";
  description?: string;
}): Promise<{ ok: true } | { error: string }> {
  const { profile } = await getProfileContext();
  if (!profile) return { error: "Sesión no válida." };
  if (!input.name.trim() || !input.datasetId || !input.columnKey) {
    return { error: "Faltan datos de la métrica." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("metrics").insert({
    tenant_id: profile.tenant_id,
    dataset_id: input.datasetId,
    name: input.name.trim(),
    column_key: input.columnKey,
    agg: input.agg,
    description: input.description?.trim() || null,
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/metrics");
  return { ok: true };
}

export async function deleteMetric(metricId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("metrics").delete().eq("id", metricId);
  revalidatePath("/metrics");
}
