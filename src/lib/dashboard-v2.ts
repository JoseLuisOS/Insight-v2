import "server-only";
import { notFound } from "next/navigation";
import { insightDb } from "@/lib/insight-db";
import { chartActor, chartOrganizations, getCoreDataset, getCoreChartMap } from "@/lib/chart-v2-datasets";
import { analyzeSurveyChart, surveyChartContext } from "@/lib/insight-charts";
import { validateChartV2, type ChartV2Definition, type ChartV2Result } from "@/lib/chart-v2";
import type { ChartConfig, Row } from "@/lib/charts";

export type DashboardV2Item = {
  id: string; chartId: string; name: string; position: number;
  layout: { x: number; y: number; w: number; h: number };
} & ({ kind: "survey"; definition: ChartV2Definition; result: ChartV2Result }
  | { kind: "dataset"; config: ChartConfig; columns: string[]; rows: Row[];
      geo?: { name: string; geojson: object; nameProperty?: string } });
export type DashboardV2 = { id: string; organizationId: string; name: string; items: DashboardV2Item[] };
export type DashboardV2SurveyFilter = {
  key: string; label: string;
  variables: { id: string; label: string; options: string[] }[];
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listDashboardsV2() {
  const actor = await chartActor();
  const organizations = await chartOrganizations();
  const query = await insightDb().query(`select d.id, d.name, d.organization_id, o.name as organization_name,
      (select count(*)::int from insight_core.core_dashboard_items i where i.dashboard_id = d.id) as chart_count
    from insight_core.core_dashboards d
    join insight_core.core_organizations o on o.id = d.organization_id
    where d.created_by = $1 and d.organization_id = any($2::uuid[])
    order by d.created_at desc`, [actor.userId, organizations.map((organization) => organization.id)]);
  return query.rows as { id: string; name: string; organization_id: string; organization_name: string; chart_count: number }[];
}

export async function loadDashboardV2(id: string): Promise<DashboardV2> {
  if (!UUID.test(id)) notFound();
  const actor = await chartActor();
  const dashboard = await insightDb().query(`select id, organization_id, name from insight_core.core_dashboards
    where id = $1 and created_by = $2`, [id, actor.userId]);
  const info = dashboard.rows[0] as { id: string; organization_id: string; name: string } | undefined;
  if (!info) notFound();
  if (!(await chartOrganizations()).some((organization) => organization.id === info.organization_id)) notFound();
  const raw = await insightDb().query(`select i.id, i.chart_id, i.position, i.layout_json, c.name, c.source_kind, c.source_id, c.definition_json
    from insight_core.core_dashboard_items i
    join insight_core.core_charts c on c.id = i.chart_id and c.organization_id = i.organization_id
    where i.dashboard_id = $1 and i.organization_id = $2 and c.created_by = $3
    order by i.position, i.created_at`, [id, info.organization_id, actor.userId]);
  const items = await Promise.all((raw.rows as {
    id: string; chart_id: string; position: number; layout_json: { x: number; y: number; w: number; h: number }; name: string;
    source_kind: "survey" | "dataset"; source_id: string; definition_json: unknown;
  }[]).map(async (row): Promise<DashboardV2Item> => {
    if (row.source_kind === "survey") {
      const definition = validateChartV2(row.definition_json);
      return { id: row.id, chartId: row.chart_id, name: row.name, position: row.position, layout: row.layout_json,
        kind: "survey", definition, result: await analyzeSurveyChart(definition) };
    }
    const saved = row.definition_json as { chart: ChartConfig };
    const data = await getCoreDataset(row.source_id);
    if (data.organization_id !== info.organization_id) notFound();
    const map = saved.chart.type === "map" && saved.chart.mapId ? await getCoreChartMap(saved.chart.mapId, info.organization_id) : null;
    return { id: row.id, chartId: row.chart_id, name: row.name, position: row.position, layout: row.layout_json,
      kind: "dataset", config: saved.chart, columns: data.columns, rows: data.rows,
      geo: map ? { name: `map_${map.id}`, geojson: map.geojson, nameProperty: map.name_property } : undefined };
  }));
  return { id: info.id, organizationId: info.organization_id, name: info.name, items };
}

export async function dashboardV2SurveyFilters(items: DashboardV2Item[]): Promise<DashboardV2SurveyFilter[]> {
  const sources = new Map<string, ChartV2Definition["source"]>();
  for (const item of items) if (item.kind === "survey") {
    const source = item.definition.source;
    sources.set(`${source.instrumentId}:${source.versionId}`, source);
  }
  const catalog = await Promise.all([...sources].map(async ([key, source]) => {
    const context = await surveyChartContext(source.instrumentId, source.versionId);
    return { key, label: `${context.detail.survey.name} · ${context.version.version}`,
      variables: context.variables.filter((variable) => variable.options.length > 0)
        .map((variable) => ({ id: variable.id, label: `${variable.code} · ${variable.label}`,
          options: variable.options })) };
  }));
  return catalog.filter((source) => source.variables.length > 0);
}
