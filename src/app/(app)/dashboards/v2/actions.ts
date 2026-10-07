"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { insightDb } from "@/lib/insight-db";
import { chartActor, chartOrganizations } from "@/lib/chart-v2-datasets";
import { loadDashboardV2 } from "@/lib/dashboard-v2";
import { analyzeSurveyChart, surveyChartContext } from "@/lib/insight-charts";
import { validateChartV2, type ChartV2Result } from "@/lib/chart-v2";
import { requireCatalogAccess } from "@/lib/insight-catalog";

async function editableDashboardItems(dashboardId: string, userId: string) {
  const allowed = (await chartOrganizations()).map((organization) => organization.id);
  const dashboard = await insightDb().query(`select id, organization_id from insight_core.core_dashboards
    where id = $1 and created_by = $2 and organization_id = any($3::uuid[])`, [dashboardId, userId, allowed]);
  const row = dashboard.rows[0] as { id: string; organization_id: string } | undefined;
  if (!row) return null;
  const items = await insightDb().query(`select id, position from insight_core.core_dashboard_items
    where dashboard_id = $1 and organization_id = $2 order by position, created_at`, [row.id, row.organization_id]);
  return { id: row.id, organizationId: row.organization_id, items: items.rows as { id: string; position: number }[] };
}

export async function createDashboardV2(form: FormData) {
  await requireCatalogAccess("dashboards");
  const actor = await chartActor();
  const name = String(form.get("name") ?? "").trim();
  const organizationId = String(form.get("organizationId") ?? "");
  if (!name || name.length > 160 || !(await chartOrganizations()).some((organization) => organization.id === organizationId))
    throw new Error("Nombre u organización no válidos.");
  const created = await insightDb().query(`insert into insight_core.core_dashboards
    (organization_id, name, created_by) values ($1, $2, $3) returning id`,
    [organizationId, name, actor.userId]);
  revalidatePath("/dashboards");
  redirect(`/dashboards/v2/${created.rows[0].id}`);
}

export async function addDashboardV2Chart(dashboardId: string, chartId: string): Promise<{ ok: true } | { error: string }> {
  await requireCatalogAccess("dashboards");
  const actor = await chartActor();
  const allowed = (await chartOrganizations()).map((organization) => organization.id);
  const added = await insightDb().query(`insert into insight_core.core_dashboard_items
    (organization_id, dashboard_id, chart_id, position, layout_json)
    select d.organization_id, d.id, c.id,
      (select coalesce(max(i.position), -1) + 1 from insight_core.core_dashboard_items i where i.dashboard_id = d.id),
      jsonb_build_object('x', ((select count(*) from insight_core.core_dashboard_items i where i.dashboard_id = d.id) % 2) * 6,
        'y', ((select count(*) from insight_core.core_dashboard_items i where i.dashboard_id = d.id) / 2) * 6,
        'w', 6, 'h', 6)
    from insight_core.core_dashboards d
    join insight_core.core_charts c on c.id = $2 and c.organization_id = d.organization_id and c.created_by = $3
    where d.id = $1 and d.created_by = $3 and d.organization_id = any($4::uuid[])
      and (select count(*) from insight_core.core_dashboard_items i where i.dashboard_id = d.id) < 12
    on conflict (dashboard_id, chart_id) do nothing returning id`, [dashboardId, chartId, actor.userId, allowed]);
  if (!added.rowCount) return { error: "Gráfica no disponible, repetida o límite de 12 alcanzado." };
  revalidatePath(`/dashboards/v2/${dashboardId}`);
  return { ok: true };
}

export async function removeDashboardV2Chart(dashboardId: string, itemId: string): Promise<{ ok: true } | { error: string }> {
  await requireCatalogAccess("dashboards");
  const actor = await chartActor();
  const allowed = (await chartOrganizations()).map((organization) => organization.id);
  const removed = await insightDb().query(`delete from insight_core.core_dashboard_items i using insight_core.core_dashboards d
    where i.id = $2 and i.dashboard_id = d.id and i.organization_id = d.organization_id
      and d.id = $1 and d.created_by = $3 and d.organization_id = any($4::uuid[])
      returning i.id`, [dashboardId, itemId, actor.userId, allowed]);
  if (!removed.rowCount) return { error: "Elemento no encontrado." };
  revalidatePath(`/dashboards/v2/${dashboardId}`);
  return { ok: true };
}

export async function renameDashboardV2(dashboardId: string, name: string): Promise<{ ok: true } | { error: string }> {
  await requireCatalogAccess("dashboards");
  const actor = await chartActor();
  const allowed = (await chartOrganizations()).map((organization) => organization.id);
  if (typeof name !== "string" || !name.trim() || name.trim().length > 160) return { error: "Nombre no válido." };
  const updated = await insightDb().query(`update insight_core.core_dashboards
    set name = $2, updated_at = now()
    where id = $1 and created_by = $3 and organization_id = any($4::uuid[]) returning id`,
    [dashboardId, name.trim(), actor.userId, allowed]);
  if (!updated.rowCount) return { error: "Dashboard no encontrado." };
  revalidatePath(`/dashboards/v2/${dashboardId}`);
  revalidatePath("/dashboards");
  return { ok: true };
}

export async function moveDashboardV2Chart(dashboardId: string, itemId: string, direction: -1 | 1): Promise<{ ok: true } | { error: string }> {
  await requireCatalogAccess("dashboards");
  const actor = await chartActor();
  if (direction !== -1 && direction !== 1) return { error: "Dirección no válida." };
  const dashboard = await editableDashboardItems(dashboardId, actor.userId);
  if (!dashboard) return { error: "Dashboard no encontrado." };
  const index = dashboard.items.findIndex((item) => item.id === itemId);
  const other = dashboard.items[index + direction];
  if (index < 0 || !other) return { error: "No se puede mover esta gráfica." };
  const current = dashboard.items[index];
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    await client.query(`update insight_core.core_dashboard_items set position = $1
      where id = $2 and organization_id = $3 and dashboard_id = $4`,
      [other.position, current.id, dashboard.organizationId, dashboardId]);
    await client.query(`update insight_core.core_dashboard_items set position = $1
      where id = $2 and organization_id = $3 and dashboard_id = $4`,
      [current.position, other.id, dashboard.organizationId, dashboardId]);
    await client.query("commit");
  } catch {
    await client.query("rollback");
    return { error: "No se pudo cambiar el orden." };
  } finally { client.release(); }
  revalidatePath(`/dashboards/v2/${dashboardId}`);
  return { ok: true };
}

export async function saveDashboardV2Layout(dashboardId: string, layout: { i: string; x: number; y: number; w: number; h: number }[]): Promise<{ ok: true } | { error: string }> {
  await requireCatalogAccess("dashboards");
  const actor = await chartActor();
  if (!Array.isArray(layout) || layout.length > 12 || layout.some((item) =>
    typeof item.i !== "string" || ![item.x,item.y,item.w,item.h].every(Number.isInteger) ||
    item.x < 0 || item.x > 11 || item.y < 0 || item.y > 1000 ||
    item.w < 2 || item.w > 12 || item.h < 4 || item.h > 20 || item.x + item.w > 12)) {
    return { error: "Distribución inválida." };
  }
  const dashboard = await editableDashboardItems(dashboardId, actor.userId);
  if (!dashboard) return { error: "Dashboard no encontrado." };
  const ids = new Set(dashboard.items.map((item) => item.id));
  if (layout.length !== ids.size || layout.some((item) => !ids.has(item.i))) return { error: "La distribución no coincide con las gráficas." };
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    for (const item of layout) await client.query(`update insight_core.core_dashboard_items set layout_json = $1::jsonb
      where id = $2 and dashboard_id = $3 and organization_id = $4`,
      [JSON.stringify({ x: item.x, y: item.y, w: item.w, h: item.h }), item.i, dashboard.id, dashboard.organizationId]);
    await client.query("commit");
  } catch {
    await client.query("rollback");
    return { error: "No se pudo guardar la distribución." };
  } finally { client.release(); }
  revalidatePath(`/dashboards/v2/${dashboardId}`);
  return { ok: true };
}

export async function filterDashboardV2Surveys(
  dashboardId: string, sourceKey: string, variableId: string, value: string,
): Promise<{ results: Record<string, ChartV2Result> } | { error: string }> {
  await requireCatalogAccess("dashboards");
  if (!/^[0-9a-f-]{36}:[0-9a-f-]{36}$/i.test(sourceKey) ||
      !/^[0-9a-f-]{36}$/i.test(variableId) || typeof value !== "string" ||
      !value.trim() || value.length > 200) return { error: "Filtro no válido." };
  const actor = await chartActor();
  const dashboard = await editableDashboardItems(dashboardId, actor.userId);
  if (!dashboard) return { error: "Dashboard no disponible." };
  const charts = await insightDb().query(`select i.id, c.definition_json
    from insight_core.core_dashboard_items i
    join insight_core.core_charts c on c.id = i.chart_id and c.organization_id = i.organization_id
    where i.dashboard_id = $1 and i.organization_id = $2
      and c.created_by = $3 and c.source_kind = 'survey'`,
    [dashboardId, dashboard.organizationId, actor.userId]);
  const selected = (charts.rows as { id: string; definition_json: unknown }[])
    .map((item) => ({ id: item.id, definition: validateChartV2(item.definition_json) }))
    .filter((item) => `${item.definition.source.instrumentId}:${item.definition.source.versionId}` === sourceKey);
  if (!selected.length) return { error: "La encuesta no está en este dashboard." };
  const [instrumentId, versionId] = sourceKey.split(":");
  const context = await surveyChartContext(instrumentId, versionId);
  const variable = context.variables.find((candidate) => candidate.id === variableId && candidate.options.includes(value));
  if (!variable || context.detail.survey.organization_id !== dashboard.organizationId)
    return { error: "La opción no pertenece a esta encuesta." };
  const results: Record<string, ChartV2Result> = {};
  await Promise.all(selected.map(async (item) => {
    results[item.id] = await analyzeSurveyChart(item.definition, { variableId, value });
  }));
  return { results };
}

export async function publishDashboardV2(dashboardId: string): Promise<{ id: string; token: string } | { error: string }> {
  await requireCatalogAccess("dashboards");
  const actor = await chartActor();
  const dashboard = await loadDashboardV2(dashboardId);
  if (!dashboard.items.length) return { error: "Añade al menos una gráfica antes de publicar." };
  const token = randomBytes(24).toString("hex");
  const publication = await insightDb().query(`insert into insight_core.core_dashboard_publications
    (organization_id, dashboard_id, token, snapshot_json, created_by)
    values ($1, $2, $3, $4::jsonb, $5) returning id`,
    [dashboard.organizationId, dashboard.id, token, JSON.stringify({ kind: "dashboard_v2", name: dashboard.name,
      items: dashboard.items, generatedAt: new Date().toISOString() }), actor.userId]);
  revalidatePath(`/dashboards/v2/${dashboardId}`);
  return { id: publication.rows[0].id as string, token };
}

export async function revokeDashboardV2Publication(id: string): Promise<{ ok: true } | { error: string }> {
  await requireCatalogAccess("dashboards");
  const actor = await chartActor();
  const allowed = (await chartOrganizations()).map((organization) => organization.id);
  const result = await insightDb().query(`update insight_core.core_dashboard_publications p set revoked_at = now()
    from insight_core.core_dashboards d
    where p.id = $1 and p.dashboard_id = d.id and p.organization_id = d.organization_id
      and d.created_by = $2 and d.organization_id = any($3::uuid[])
      and p.revoked_at is null returning p.id`, [id, actor.userId, allowed]);
  if (!result.rowCount) return { error: "Publicación no encontrada." };
  return { ok: true };
}
