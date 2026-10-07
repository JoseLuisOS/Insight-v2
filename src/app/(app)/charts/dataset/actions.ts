"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { insightDb } from "@/lib/insight-db";
import { chartActor, getCoreDataset, getCoreChartMap } from "@/lib/chart-v2-datasets";
import type { ChartConfig } from "@/lib/charts";

type DatasetChartDefinition = { version: 2; source: { kind: "dataset"; datasetId: string }; chart: ChartConfig };
const chartTypes = new Set(["kpi","bar","line","area","pie","table","map","scatter","histogram","boxplot"]);
function definition(datasetId: string, chart: ChartConfig): DatasetChartDefinition {
  if (!chart || !chartTypes.has(chart.type)) throw new Error("Tipo de gráfica inválido.");
  return { version: 2, source: { kind: "dataset", datasetId }, chart };
}

async function validConfig(config: ChartConfig, columns: string[], organizationId: string) {
  if (JSON.stringify(config).length > 15000 ||
      !["sum","avg","count","min","max","none",undefined].includes(config.aggregation) ||
      (config.bins !== undefined && (!Number.isInteger(config.bins) || config.bins < 2 || config.bins > 100)) ||
      (config.x !== undefined && typeof config.x !== "string") ||
      (config.y !== undefined && typeof config.y !== "string")) return false;
  if ((config.x && !columns.includes(config.x)) || (config.y && !columns.includes(config.y)) ||
      (config.title && (typeof config.title !== "string" || config.title.length > 160)) ||
      (config.palette && (!Array.isArray(config.palette) || config.palette.length > 20 ||
        config.palette.some((color) => !/^#[0-9a-fA-F]{6}$/.test(color))))) return false;
  if (config.type === "map") return !!(config.mapId && await getCoreChartMap(config.mapId, organizationId));
  return true;
}

export async function saveCoreDatasetChart(datasetId: string, name: string, config: ChartConfig, chartId?: string): Promise<{ chartId: string } | { error: string }> {
  const actor = await chartActor();
  const data = await getCoreDataset(datasetId, 1);
  if (typeof name !== "string" || !name.trim() || name.trim().length > 160) return { error: "Nombre no válido." };
  const saved = definition(datasetId, config);
  if (!(await validConfig(config, data.columns, data.organization_id))) return { error: "Campos o mapa no válidos para este dataset." };
  if (chartId) {
    const result = await insightDb().query(`update insight_core.core_charts
      set name = $1, definition_json = $2::jsonb, updated_at = now()
      where id = $3 and organization_id = $4 and source_id = $5 and source_kind = 'dataset' and created_by = $6 returning id`,
      [name.trim(), JSON.stringify(saved), chartId, data.organization_id, datasetId, actor.userId]);
    if (!result.rowCount) return { error: "Gráfica no encontrada." };
    revalidatePath(`/charts/dataset/${chartId}`);
    revalidatePath("/charts");
    return { chartId };
  }
  const created = await insightDb().query(`insert into insight_core.core_charts
    (organization_id, source_kind, source_id, name, definition_json, created_by)
    values ($1, 'dataset', $2, $3, $4::jsonb, $5) returning id`,
    [data.organization_id, datasetId, name.trim(), JSON.stringify(saved), actor.userId]);
  revalidatePath("/charts");
  return { chartId: created.rows[0].id as string };
}

export async function publishCoreDatasetChart(chartId: string): Promise<{ id: string; token: string } | { error: string }> {
  const actor = await chartActor();
  const chart = await insightDb().query(`select id, organization_id, name, source_id, definition_json
    from insight_core.core_charts where id = $1 and source_kind = 'dataset' and created_by = $2`, [chartId, actor.userId]);
  const row = chart.rows[0] as { id: string; organization_id: string; name: string; source_id: string; definition_json: DatasetChartDefinition } | undefined;
  if (!row) return { error: "Gráfica no encontrada." };
  const data = await getCoreDataset(row.source_id);
  if (data.organization_id !== row.organization_id) return { error: "Fuente no disponible." };
  const config = row.definition_json.chart;
  const map = config.type === "map" && config.mapId ? await getCoreChartMap(config.mapId, data.organization_id) : null;
  if (config.type === "map" && !map) return { error: "Mapa no disponible." };
  const token = randomBytes(24).toString("hex");
  const publication = await insightDb().query(`insert into insight_core.core_chart_publications
    (organization_id, chart_id, token, snapshot_json, created_by)
    values ($1, $2, $3, $4::jsonb, $5) returning id`,
    [row.organization_id, chartId, token, JSON.stringify({ kind: "dataset_chart_v2", name: row.name,
      config, columns: data.columns, rows: data.rows,
      geo: map ? { name: `map_${map.id}`, geojson: map.geojson, nameProperty: map.name_property } : undefined,
      generatedAt: new Date().toISOString() }), actor.userId]);
  revalidatePath(`/charts/dataset/${chartId}`);
  return { id: publication.rows[0].id as string, token };
}
