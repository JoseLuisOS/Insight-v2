"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getProfileContext } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboards";
import { createClient } from "@/lib/supabase/server";
import type { PublishOptions, PublishState } from "@/app/(app)/charts/publish-actions";

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
  await supabase.from("publications").update({ settings_json: settings, expires_at }).eq("id", publicationId);
  if (options.password !== undefined) {
    await supabase.rpc("set_publication_password", {
      p_publication_id: publicationId,
      p_password: options.password,
    });
  }
}

/** Publish (or change visibility of) a dashboard and refresh its snapshot. */
export async function publishDashboard(
  dashboardId: string,
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

  const { data: existing } = await supabase
    .from("publications")
    .select("id, publish_token")
    .eq("resource_type", "dashboard")
    .eq("resource_id", dashboardId)
    .maybeSingle();

  const token =
    visibility === "private"
      ? null
      : (existing?.publish_token ??
        randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 8));

  let publicationId = existing?.id as string | undefined;

  if (existing) {
    const { error } = await supabase
      .from("publications")
      .update({
        visibility,
        publish_token: token,
        revoked_at: visibility === "private" ? new Date().toISOString() : null,
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("publications")
      .insert({
        tenant_id: profile.tenant_id,
        resource_type: "dashboard",
        resource_id: dashboardId,
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

  if (isPublic && publicationId) {
    const dash = await getDashboardData(dashboardId);
    const snapshot = {
      kind: "dashboard",
      name: dash?.name ?? "Dashboard",
      items: (dash?.items ?? []).map((it) => ({
        id: it.id,
        name: it.name,
        config: it.config,
        layout: it.layout,
        columns: it.columns,
        rows: it.rows,
        geo: it.geo,
      })),
      filters: dash?.filters ?? [],
    };
    await supabase.from("snapshots").insert({ publication_id: publicationId, data_json: snapshot });
  }

  revalidatePath(`/dashboards/${dashboardId}`);
  return { token };
}

export async function getDashboardPublication(
  dashboardId: string,
): Promise<PublishState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("publications")
    .select("visibility, publish_token, revoked_at, settings_json")
    .eq("resource_type", "dashboard")
    .eq("resource_id", dashboardId)
    .maybeSingle();

  if (!data || data.revoked_at) return { visibility: "private", token: null };
  return {
    visibility: data.visibility as PublishState["visibility"],
    token: (data.publish_token as string) ?? null,
    settings: (data.settings_json as PublishOptions) ?? undefined,
  };
}
