"use server";

import { revalidatePath } from "next/cache";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ChartConfig } from "@/lib/charts";

export type SaveChartResult = { chartId: string } | { error: string };

export async function saveChart(
  datasetId: string,
  name: string,
  config: ChartConfig,
): Promise<SaveChartResult> {
  const { profile } = await getProfileContext();
  if (!profile) return { error: "Sesión no válida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charts")
    .insert({
      tenant_id: profile.tenant_id,
      dataset_id: datasetId,
      name: name.trim() || "Gráfica",
      type: config.type,
      config_json: config,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/charts");
  revalidatePath("/dashboard");
  return { chartId: data.id as string };
}

export async function updateChart(
  chartId: string,
  name: string,
  config: ChartConfig,
): Promise<SaveChartResult> {
  const supabase = await createClient();
  // RLS layer-2 allows editors/admins (or an edit grant) to update.
  const { error } = await supabase
    .from("charts")
    .update({
      name: name.trim() || "Gráfica",
      type: config.type,
      config_json: config,
    })
    .eq("id", chartId);

  if (error) return { error: error.message };

  revalidatePath(`/charts/${chartId}`);
  revalidatePath("/charts");
  revalidatePath("/dashboard");
  return { chartId };
}
