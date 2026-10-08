"use server";

import { revalidatePath } from "next/cache";
import { chartActor, chartOrganizations } from "@/lib/chart-v2-datasets";
import { insightQuery } from "@/lib/insight-db";
import { computeChartSnapshot, findGalleryChart } from "@/lib/chart-gallery";
import type { ChartSnapshot, ChartVisibility } from "@/lib/chart-snapshot";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVALID = "Gráfica no válida.";
const NOT_FOUND = "Gráfica no encontrada o sin permiso.";

async function scope() {
  const actor = await chartActor();
  const organizations = (await chartOrganizations()).map((organization) => organization.id);
  return { actor, organizations };
}

export async function setChartVisibility(chartId: string, visibility: ChartVisibility): Promise<{ ok: true } | { error: string }> {
  if (!UUID.test(chartId)) return { error: INVALID };
  if (visibility !== "private" && visibility !== "organization") return { error: "Visibilidad no válida." };
  const { actor, organizations } = await scope();
  // Al compartir, el autor debe conservar acceso a la fuente; la instantánea se renueva para el equipo.
  let preview: string | null = null;
  if (visibility === "organization") {
    const found = await insightQuery("charts.visibility_source", `select source_kind, source_id, organization_id, definition_json
      from insight_core.core_charts where id = $1 and created_by = $2 and organization_id = any($3::uuid[])`,
      [chartId, actor.userId, organizations]);
    const chart = found.rows[0] as Parameters<typeof computeChartSnapshot>[0] | undefined;
    if (!chart) return { error: NOT_FOUND };
    try { preview = JSON.stringify(await computeChartSnapshot(chart)); }
    catch { return { error: "No se pudo compartir: verifica que aún tienes acceso a la fuente de datos." }; }
  }
  const result = await insightQuery("charts.visibility", `update insight_core.core_charts set visibility = $1,
      preview_json = coalesce($5::jsonb, preview_json),
      preview_updated_at = case when $5::jsonb is null then preview_updated_at else now() end
    where id = $2 and created_by = $3 and organization_id = any($4::uuid[]) returning id`,
    [visibility, chartId, actor.userId, organizations, preview]);
  if (!result.rowCount) return { error: NOT_FOUND };
  revalidatePath("/charts");
  return { ok: true };
}

export async function duplicateChart(chartId: string): Promise<{ chartId: string; href: string } | { error: string }> {
  if (!UUID.test(chartId)) return { error: INVALID };
  const { actor, organizations } = await scope();
  const chart = await findGalleryChart(chartId);
  if (!chart || !chart.canDuplicate) return { error: NOT_FOUND };
  const created = await insightQuery("charts.duplicate", `insert into insight_core.core_charts
      (organization_id, source_kind, source_id, source_version_id, name, definition_json, preview_json, preview_updated_at, visibility, created_by)
    select organization_id, source_kind, source_id, source_version_id, left(name || ' (copia)', 160), definition_json,
      preview_json, preview_updated_at, 'private', $2
    from insight_core.core_charts where id = $1 and organization_id = any($3::uuid[]) returning id`,
    [chartId, actor.userId, organizations]);
  const id = created.rows[0]?.id as string | undefined;
  if (!id) return { error: NOT_FOUND };
  revalidatePath("/charts");
  return { chartId: id, href: `/charts/${chart.sourceKind}/${id}` };
}

export async function deleteChart(chartId: string): Promise<{ ok: true } | { error: string }> {
  if (!UUID.test(chartId)) return { error: INVALID };
  const { actor, organizations } = await scope();
  const result = await insightQuery("charts.delete", `delete from insight_core.core_charts
    where id = $1 and created_by = $2 and organization_id = any($3::uuid[]) returning id`,
    [chartId, actor.userId, organizations]);
  if (!result.rowCount) return { error: NOT_FOUND };
  revalidatePath("/charts");
  revalidatePath("/dashboards");
  return { ok: true };
}

export async function refreshChartPreview(chartId: string): Promise<{ snapshot: ChartSnapshot } | { error: string }> {
  if (!UUID.test(chartId)) return { error: INVALID };
  const { actor, organizations } = await scope();
  const found = await insightQuery("charts.previewRead", `select organization_id, source_kind, source_id, definition_json
    from insight_core.core_charts where id = $1 and created_by = $2 and organization_id = any($3::uuid[])`,
    [chartId, actor.userId, organizations]);
  const row = found.rows[0] as { organization_id: string; source_kind: "survey" | "dataset"; source_id: string; definition_json: unknown } | undefined;
  if (!row) return { error: NOT_FOUND };
  try {
    const snapshot = await computeChartSnapshot(row);
    const saved = await insightQuery("charts.previewWrite", `update insight_core.core_charts
      set preview_json = $1::jsonb, preview_updated_at = now()
      where id = $2 and created_by = $3 and organization_id = any($4::uuid[]) returning id`,
      [JSON.stringify(snapshot), chartId, actor.userId, organizations]);
    if (!saved.rowCount) return { error: NOT_FOUND };
    return { snapshot };
  } catch {
    return { error: "No se pudo generar la vista previa." };
  }
}
