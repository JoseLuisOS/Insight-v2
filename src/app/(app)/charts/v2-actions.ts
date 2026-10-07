"use server";

import { revalidatePath } from "next/cache";
import { insightDb } from "@/lib/insight-db";
import { chartActor, chartOrganizations } from "@/lib/chart-v2-datasets";

export async function addChartV2Annotation(chartId: string, body: string): Promise<{ annotation: { id: string; body: string; created_at: string } } | { error: string }> {
  const actor = await chartActor();
  const allowed = (await chartOrganizations()).map((organization) => organization.id);
  if (typeof body !== "string" || !body.trim() || body.trim().length > 4000) return { error: "Escribe una anotación de hasta 4,000 caracteres." };
  const added = await insightDb().query(`insert into insight_core.core_chart_annotations
    (organization_id, chart_id, body, created_by)
    select organization_id, id, $2, $3 from insight_core.core_charts
    where id = $1 and created_by = $3 and organization_id = any($4::uuid[])
    returning id, body, created_at`, [chartId, body.trim(), actor.userId, allowed]);
  if (!added.rowCount) return { error: "Gráfica no encontrada." };
  revalidatePath("/charts");
  return { annotation: added.rows[0] as { id: string; body: string; created_at: string } };
}

export async function deleteChartV2Annotation(annotationId: string): Promise<{ ok: true } | { error: string }> {
  const actor = await chartActor();
  const allowed = (await chartOrganizations()).map((organization) => organization.id);
  const deleted = await insightDb().query(`delete from insight_core.core_chart_annotations a using insight_core.core_charts c
    where a.id = $1 and a.chart_id = c.id and a.organization_id = c.organization_id
      and c.created_by = $2 and c.organization_id = any($3::uuid[]) returning a.id`, [annotationId, actor.userId, allowed]);
  if (!deleted.rowCount) return { error: "Anotación no encontrada." };
  return { ok: true };
}
