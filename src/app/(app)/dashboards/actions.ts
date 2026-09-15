"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Form action: create a dashboard and go straight to its editor. */
export async function createDashboardAndEdit(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const res = await createDashboard(name);
  if ("error" in res) {
    redirect(`/dashboards?error=${encodeURIComponent(res.error)}`);
  }
  redirect(`/dashboards/${res.id}/edit`);
}

export type DashboardItemInput = {
  chart_id: string;
  layout_json: { x: number; y: number; w: number; h: number };
};

export type DashboardFilterInput = {
  type: "date_range" | "dropdown";
  config_json: { column: string; label?: string };
};

export async function createDashboard(
  name: string,
): Promise<{ id: string } | { error: string }> {
  const { profile } = await getProfileContext();
  if (!profile) return { error: "Sesión no válida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboards")
    .insert({ tenant_id: profile.tenant_id, name: name.trim() || "Dashboard", created_by: profile.id })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboards");
  return { id: data.id as string };
}

export async function saveDashboard(
  dashboardId: string,
  name: string,
  items: DashboardItemInput[],
  filters: DashboardFilterInput[],
  layouts?: Record<string, { i: string; x: number; y: number; w: number; h: number }[]>,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();

  const { error: nameErr } = await supabase
    .from("dashboards")
    .update({ name: name.trim() || "Dashboard", layouts_json: layouts ?? null })
    .eq("id", dashboardId);
  if (nameErr) return { error: nameErr.message };

  // Replace items + filters (RLS scopes everything to the tenant via the parent).
  await supabase.from("dashboard_items").delete().eq("dashboard_id", dashboardId);
  await supabase.from("dashboard_filters").delete().eq("dashboard_id", dashboardId);

  if (items.length) {
    const { error } = await supabase.from("dashboard_items").insert(
      items.map((it) => ({
        dashboard_id: dashboardId,
        chart_id: it.chart_id,
        layout_json: it.layout_json,
      })),
    );
    if (error) return { error: error.message };
  }

  if (filters.length) {
    const { error } = await supabase.from("dashboard_filters").insert(
      filters.map((f) => ({
        dashboard_id: dashboardId,
        type: f.type,
        config_json: f.config_json,
      })),
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboards/${dashboardId}`);
  revalidatePath("/dashboards");
  return { ok: true };
}
