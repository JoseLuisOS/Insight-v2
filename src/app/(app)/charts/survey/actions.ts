"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCatalogAccess } from "@/lib/insight-catalog";
import { insightDb } from "@/lib/insight-db";
import { analyzeSurveyChart, surveyChartContext } from "@/lib/insight-charts";
import { validateChartV2, type ChartV2Definition, type ChartV2Result } from "@/lib/chart-v2";
import { chartOrganizations } from "@/lib/chart-v2-datasets";
import type { ChartVisibility } from "@/lib/chart-snapshot";
import { surveySnapshot } from "@/lib/chart-snapshot";

async function actorId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida.");
  return user.id;
}

export async function previewSurveyChart(input: ChartV2Definition): Promise<{ result: ChartV2Result } | { error: string }> {
  await requireCatalogAccess("graficas");
  try {
    const definition = validateChartV2(input);
    return { result: await analyzeSurveyChart(definition) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo calcular la gráfica." };
  }
}

export async function saveSurveyChart(name: string, input: ChartV2Definition, chartId?: string, visibility?: ChartVisibility): Promise<{ chartId: string } | { error: string }> {
  await requireCatalogAccess("graficas");
  const userId = await actorId();
  try {
    const definition = validateChartV2(input);
    if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 160) return { error: "Escribe un nombre de hasta 160 caracteres." };
    const { detail } = await surveyChartContext(definition.source.instrumentId, definition.source.versionId);
    const result = await analyzeSurveyChart(definition);
    let preview: string | null = null;
    try { preview = JSON.stringify(surveySnapshot(definition, result)); } catch { /* la vista previa no bloquea el guardado */ }
    if (chartId) {
      const updated = await insightDb().query(`update insight_core.core_charts
        set name = $1, definition_json = $2::jsonb, preview_json = $6::jsonb, preview_updated_at = now(), updated_at = now(),
          source_kind = 'survey', source_id = $7, source_version_id = $8
        where id = $3 and organization_id = $4 and created_by = $5
        returning id`, [name.trim(), JSON.stringify(definition), chartId, detail.survey.organization_id, userId, preview,
          definition.source.instrumentId, definition.source.versionId]);
      if (!updated.rowCount) return { error: "Gráfica no encontrada, sin permiso o con una fuente de otra organización." };
      revalidatePath(`/charts/survey/${chartId}`);
      revalidatePath(`/charts/dataset/${chartId}`);
      revalidatePath("/charts");
      return { chartId };
    }
    const created = await insightDb().query(`insert into insight_core.core_charts
      (organization_id, source_kind, source_id, source_version_id, name, definition_json, created_by, preview_json, preview_updated_at, visibility)
      values ($1, 'survey', $2, $3, $4, $5::jsonb, $6, $7::jsonb, now(), $8) returning id`,
      [detail.survey.organization_id, definition.source.instrumentId, definition.source.versionId,
        name.trim(), JSON.stringify(definition), userId, preview, visibility === "organization" ? "organization" : "private"]);
    revalidatePath("/charts");
    return { chartId: created.rows[0].id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo guardar la gráfica." };
  }
}

export async function publishSurveyChart(chartId: string): Promise<{ id: string; token: string } | { error: string }> {
  await requireCatalogAccess("graficas");
  const userId = await actorId();
  const chart = await insightDb().query(
    `select id, organization_id, name, definition_json from insight_core.core_charts
      where id = $1 and created_by = $2 and source_kind = 'survey'`, [chartId, userId]);
  if (!chart.rows[0]) return { error: "Gráfica no encontrada." };
  const row = chart.rows[0] as { id: string; organization_id: string; name: string; definition_json: ChartV2Definition };
  const definition = validateChartV2(row.definition_json);
  const { detail } = await surveyChartContext(definition.source.instrumentId, definition.source.versionId);
  if (detail.survey.organization_id !== row.organization_id) return { error: "Fuente no disponible." };
  const result = await analyzeSurveyChart(definition);
  const token = randomBytes(24).toString("hex");
  const publication = await insightDb().query(`insert into insight_core.core_chart_publications
    (organization_id, chart_id, token, snapshot_json, created_by)
    values ($1, $2, $3, $4::jsonb, $5) returning id`, [row.organization_id, chartId, token,
      JSON.stringify({ kind: "survey_chart_v2", name: row.name, definition, result, sourceName: detail.survey.name,
        version: detail.survey.version, generatedAt: new Date().toISOString() }), userId]);
  revalidatePath(`/charts/survey/${chartId}`);
  return { id: publication.rows[0].id, token };
}

export async function revokeSurveyPublication(publicationId: string): Promise<{ ok: true } | { error: string }> {
  await requireCatalogAccess("graficas");
  const userId = await actorId();
  const allowed = (await chartOrganizations()).map((organization) => organization.id);
  const revoked = await insightDb().query(`update insight_core.core_chart_publications p set revoked_at = now()
    from insight_core.core_charts c
    where p.id = $1 and p.chart_id = c.id and p.organization_id = c.organization_id
      and c.created_by = $2 and c.organization_id = any($3::uuid[])
      and p.revoked_at is null returning p.id`, [publicationId, userId, allowed]);
  if (!revoked.rowCount) return { error: "Publicación no encontrada." };
  revalidatePath("/charts");
  return { ok: true };
}
