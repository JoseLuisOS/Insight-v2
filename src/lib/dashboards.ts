import { createClient } from "@/lib/supabase/server";
import { fetchDatasetData } from "@/lib/datasets";
import { getGeoForConfig, type Geo } from "@/lib/maps";
import type { ChartConfig, Row } from "@/lib/charts";

export type DashboardItemData = {
  id: string;
  chartId: string;
  name: string;
  config: ChartConfig;
  layout: { x: number; y: number; w: number; h: number };
  columns: string[];
  rows: Row[];
  geo?: Geo;
};

export type DashboardFilter = {
  id: string;
  type: "date_range" | "dropdown";
  config: { column: string; label?: string };
};

export type DashboardData = {
  id: string;
  name: string;
  items: DashboardItemData[];
  filters: DashboardFilter[];
  layouts?: Record<string, { i: string; x: number; y: number; w: number; h: number }[]>;
};

export async function getDashboardData(
  dashboardId: string,
): Promise<DashboardData | null> {
  const supabase = await createClient();

  const { data: dashboard } = await supabase
    .from("dashboards")
    .select("id, name, layouts_json")
    .eq("id", dashboardId)
    .maybeSingle();
  if (!dashboard) return null;

  const [{ data: items }, { data: filters }] = await Promise.all([
    supabase
      .from("dashboard_items")
      .select("id, chart_id, layout_json, charts(name, config_json, dataset_id)")
      .eq("dashboard_id", dashboardId),
    supabase
      .from("dashboard_filters")
      .select("id, type, config_json")
      .eq("dashboard_id", dashboardId),
  ]);

  const rawItems = (items as unknown as {
    id: string;
    chart_id: string;
    layout_json: { x: number; y: number; w: number; h: number };
    charts: { name: string; config_json: ChartConfig; dataset_id: string } | null;
  }[]) ?? [];

  // Fetch each chart's data (deduped by dataset).
  const datasetCache = new Map<string, Awaited<ReturnType<typeof fetchDatasetData>>>();
  const resolved: DashboardItemData[] = [];
  for (const it of rawItems) {
    if (!it.charts) continue;
    const dsId = it.charts.dataset_id;
    if (dsId && !datasetCache.has(dsId)) {
      datasetCache.set(dsId, await fetchDatasetData(dsId, 5000));
    }
    const data = dsId ? datasetCache.get(dsId) : null;
    const geo = await getGeoForConfig(supabase, it.charts.config_json);
    resolved.push({
      id: it.id,
      chartId: it.chart_id,
      name: it.charts.name,
      config: it.charts.config_json,
      layout: it.layout_json,
      columns: data?.columns ?? [],
      rows: data?.rows ?? [],
      geo,
    });
  }

  const resolvedFilters: DashboardFilter[] = (
    (filters as { id: string; type: "date_range" | "dropdown"; config_json: { column: string; label?: string } }[]) ?? []
  ).map((f) => ({ id: f.id, type: f.type, config: f.config_json }));

  return {
    id: dashboard.id,
    name: dashboard.name,
    items: resolved,
    filters: resolvedFilters,
    layouts: (dashboard.layouts_json as DashboardData["layouts"]) ?? undefined,
  };
}
