"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getProfileContext } from "@/lib/auth";
import { fetchDatasetData } from "@/lib/datasets";
import { getGeoForConfig } from "@/lib/maps";
import { createClient } from "@/lib/supabase/server";
import type { ChartConfig } from "@/lib/charts";

export type PublishState = {
  visibility: "private" | "internal" | "public_link" | "public_embed";
  token: string | null;
  settings?: PublishOptions;
};

export type PublishOptions = {
  hideTitle?: boolean;
  theme?: "auto" | "light" | "dark";
  expiresInDays?: number | null;
  password?: string | null; // null = clear, undefined = leave unchanged
};

/** Apply expiry / settings / password to a publication after upsert. */
async function applyOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  publicationId: string,
  options: PublishOptions | undefined,
) {
  if (!options) return;
  const settings = { hideTitle: !!options.hideTitle, theme: options.theme ?? "auto" };
  const expires_at =
    options.expiresInDays && options.expiresInDays > 0
      ? new Date(Date.now() + options.expiresInDays * 86400_000).toISOString()
      : null;
  await supabase
    .from("publications")
    .update({ settings_json: settings, expires_at })
    .eq("id", publicationId);
  if (options.password !== undefined) {
    await supabase.rpc("set_publication_password", {
      p_publication_id: publicationId,
      p_password: options.password,
    });
  }
}

/** Publish (or change visibility of) a chart and refresh its snapshot. */
export async function publishChart(
  chartId: string,
  visibility: PublishState["visibility"],
  options?: PublishOptions,
): Promise<{ token: string | null } | { error: string }> {
  const { profile } = await getProfileContext();
  if (!profile) return { error: "Sesión no válida." };

  const isPublic = visibility === "public_link" || visibility === "public_embed";
  if (isPublic && !(profile.can_publish || profile.role === "admin")) {
    return { error: "No tienes permiso para publicar al exterior." };
  }

  const supabase = await createClient();

  // Load the chart (RLS scopes to tenant).
  const { data: chart } = await supabase
    .from("charts")
    .select("id, name, config_json, dataset_id")
    .eq("id", chartId)
    .maybeSingle();
  if (!chart) return { error: "Gráfica no encontrada." };

  // Find or create the publication row.
  const { data: existing } = await supabase
    .from("publications")
    .select("id, publish_token")
    .eq("resource_type", "chart")
    .eq("resource_id", chartId)
    .maybeSingle();

  const token =
    visibility === "private"
      ? null
      : (existing?.publish_token ?? randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 8));

  let publicationId = existing?.id as string | undefined;

  if (existing) {
    const { error } = await supabase
      .from("publications")
      .update({ visibility, publish_token: token, revoked_at: visibility === "private" ? new Date().toISOString() : null })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("publications")
      .insert({
        tenant_id: profile.tenant_id,
        resource_type: "chart",
        resource_id: chartId,
        visibility,
        publish_token: token,
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    publicationId = data.id as string;
  }

  if (publicationId && isPublic) {
    await applyOptions(supabase, publicationId, options);
  }

  // Generate a fresh snapshot for public visibilities (frozen data; tenant forced
  // here, server-side, by reading under the authenticated user).
  if (isPublic && publicationId) {
    const data = chart.dataset_id
      ? await fetchDatasetData(chart.dataset_id, 5000, true) // fresh data for snapshot
      : null;
    const snapshot = {
      kind: "chart",
      name: chart.name,
      config: chart.config_json as ChartConfig,
      columns: data?.columns ?? [],
      rows: data?.rows ?? [],
      geo: await getGeoForConfig(supabase, chart.config_json as ChartConfig),
    };
    await supabase.from("snapshots").insert({ publication_id: publicationId, data_json: snapshot });
  }

  revalidatePath(`/charts/${chartId}`);
  return { token };
}

/** Sign a per-viewer embed filter ("column=value") for a published resource. */
export async function signEmbed(
  resourceType: "chart" | "dashboard",
  resourceId: string,
  payload: string,
): Promise<{ sig: string } | { error: string }> {
  const supabase = await createClient();
  const { data: pub } = await supabase
    .from("publications")
    .select("id")
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .maybeSingle();
  if (!pub) return { error: "Publica primero el recurso." };
  const { data, error } = await supabase.rpc("sign_embed_params", {
    p_publication_id: pub.id,
    p_payload: payload,
  });
  if (error) return { error: error.message };
  return { sig: data as string };
}

export async function getPublicationViewCount(
  resourceType: "chart" | "dashboard",
  resourceId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data: pub } = await supabase
    .from("publications")
    .select("id")
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .maybeSingle();
  if (!pub) return 0;
  const { count } = await supabase
    .from("embed_views")
    .select("*", { count: "exact", head: true })
    .eq("publication_id", pub.id);
  return count ?? 0;
}

export async function getChartPublication(chartId: string): Promise<PublishState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("publications")
    .select("visibility, publish_token, revoked_at, settings_json")
    .eq("resource_type", "chart")
    .eq("resource_id", chartId)
    .maybeSingle();

  if (!data || data.revoked_at) return { visibility: "private", token: null };
  return {
    visibility: data.visibility as PublishState["visibility"],
    token: (data.publish_token as string) ?? null,
    settings: (data.settings_json as PublishOptions) ?? undefined,
  };
}
