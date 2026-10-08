import "server-only";
import { notFound } from "next/navigation";
import { chartActor, chartOrganizations, getCoreDataset } from "@/lib/chart-v2-datasets";
import { insightQuery } from "@/lib/insight-db";
import { analyzeSurveyChart, surveyChartContext } from "@/lib/insight-charts";
import { visibleSurveyResources } from "@/lib/insight-surveys";
import { validateChartV2 } from "@/lib/chart-v2";
import type { ChartConfig } from "@/lib/charts";
import { logDuration } from "@/lib/server-log";
import {
  datasetSnapshot, readSnapshot, surveySnapshot, thumbnailSnapshot,
  type ChartSnapshot, type ChartSnapshotType, type ChartVisibility, type GalleryChart, type GalleryDashboard,
} from "@/lib/chart-snapshot";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPE_SQL = `case when c.source_kind = 'survey' then c.definition_json->>'type' else c.definition_json->'chart'->>'type' end`;

type GalleryRow = {
  id: string; name: string; type: ChartSnapshotType; source_kind: "survey" | "dataset"; source_id: string;
  source_name: string | null; organization_id: string; organization_name: string; visibility: ChartVisibility;
  created_by: string; author_name: string; updated_at: Date | string; preview_json: unknown;
};

async function galleryRows(chartId?: string): Promise<GalleryChart[]> {
  const started = performance.now();
  const actor = await chartActor();
  const organizations = await chartOrganizations();
  if (!organizations.length) return [];
  const result = await insightQuery("charts.gallery", `select c.id, c.name, ${TYPE_SQL} as type, c.source_kind, c.source_id,
      coalesce(i.name, d.name) as source_name, c.organization_id, o.name as organization_name, c.visibility, c.created_by,
      coalesce(p.display_name, 'Usuario') as author_name, c.updated_at, c.preview_json
    from insight_core.core_charts c
    join insight_core.core_organizations o on o.id = c.organization_id
    left join insight_survey.survey_instruments i on c.source_kind = 'survey' and i.id = c.source_id and i.organization_id = c.organization_id
      and not exists (select 1 from insight_survey.survey_import_jobs j
        where j.id::text = i.metadata->>'import_job_id' and j.status <> 'completed')
    left join insight_core.core_datasets d on c.source_kind = 'dataset' and d.id = c.source_id and d.organization_id = c.organization_id
    left join insight_core.core_user_profiles p on p.user_id = c.created_by
    where c.organization_id = any($1::uuid[]) and (c.created_by = $2 or c.visibility = 'organization')
      and ($3::uuid is null or c.id = $3::uuid)
    order by c.updated_at desc limit 500`,
    [organizations.map((organization) => organization.id), actor.userId, chartId ?? null]);
  const rows = result.rows as GalleryRow[];

  // Compartidas de Encuestas ajenas: exigen permiso en la organización y acceso al recurso.
  const foreignSurveys = rows.filter((row) => row.created_by !== actor.userId && row.source_kind === "survey");
  const allowed = new Set<string>();
  if (foreignSurveys.length) {
    if (actor.admin) foreignSurveys.forEach((row) => allowed.add(row.id));
    else {
      const orgIds = [...new Set(foreignSurveys.map((row) => row.organization_id))];
      const checks = await Promise.all(orgIds.map(async (org) => {
        const [access, view] = await Promise.all(["survey.access", "survey.view"].map((code) =>
          actor.supabase.rpc("iam_has_permission", { p_org: org, p_code: code })));
        return [org, access.data === true && !access.error && view.data === true && !view.error] as const;
      }));
      const orgOk = new Map(checks);
      const candidates = foreignSurveys.filter((row) => orgOk.get(row.organization_id));
      const visible = await visibleSurveyResources(actor, candidates.map((row) => ({ id: row.source_id, organization_id: row.organization_id })));
      candidates.forEach((row, index) => { if (visible[index]) allowed.add(row.id); });
    }
  }

  const charts = rows.flatMap((row): GalleryChart[] => {
    const owner = row.created_by === actor.userId;
    // Ajenas sin fuente disponible (borrada o con importación pendiente) no se muestran.
    if (!owner && (row.source_name === null || (row.source_kind === "survey" && !allowed.has(row.id)))) return [];
    return [{
      id: row.id, name: row.name, type: row.type, sourceKind: row.source_kind, sourceName: row.source_name ?? "Fuente no disponible",
      organizationId: row.organization_id, organizationName: row.organization_name, visibility: row.visibility, owner,
      authorName: row.author_name, updatedAt: new Date(row.updated_at).toISOString(), snapshot: chartId ? readSnapshot(row.preview_json) : thumbnailSnapshot(readSnapshot(row.preview_json)),
      href: owner ? `/charts/${row.source_kind}/${row.id}` : `/charts/view/${row.id}`,
      canDuplicate: owner || row.source_kind === "survey",
    }];
  });
  await logDuration("charts.gallery", started, { count: charts.length });
  return charts;
}

export async function listChartGallery(): Promise<GalleryChart[]> {
  return galleryRows();
}

/** Como `loadSharedChart`, pero devuelve null en lugar de notFound. */
export async function findGalleryChart(id: string): Promise<GalleryChart | null> {
  if (!UUID.test(id)) return null;
  return (await galleryRows(id))[0] ?? null;
}

export async function loadSharedChart(id: string): Promise<GalleryChart> {
  const chart = await findGalleryChart(id);
  if (!chart) notFound();
  return chart;
}

export async function computeChartSnapshot(chart: {
  source_kind: "survey" | "dataset"; source_id: string; organization_id: string; definition_json: unknown;
}): Promise<ChartSnapshot> {
  if (chart.source_kind === "survey") {
    const definition = validateChartV2(chart.definition_json);
    const context = await surveyChartContext(definition.source.instrumentId, definition.source.versionId);
    if (context.detail.survey.organization_id !== chart.organization_id) throw new Error("Fuente no disponible.");
    return surveySnapshot(definition, await analyzeSurveyChart(definition));
  }
  const data = await getCoreDataset(chart.source_id);
  if (data.organization_id !== chart.organization_id) throw new Error("Fuente no disponible.");
  const config = (chart.definition_json as { chart: ChartConfig }).chart;
  return datasetSnapshot(config, data.rows);
}

export async function listDashboardGallery(): Promise<GalleryDashboard[]> {
  const started = performance.now();
  const actor = await chartActor();
  const organizations = await chartOrganizations();
  if (!organizations.length) return [];
  const orgIds = organizations.map((organization) => organization.id);
  const dashboards = await insightQuery("charts.dashboardGallery", `select d.id, d.name, o.name as organization_name, d.updated_at,
      (select count(*)::int from insight_core.core_dashboard_items i where i.dashboard_id = d.id) as chart_count
    from insight_core.core_dashboards d
    join insight_core.core_organizations o on o.id = d.organization_id
    where d.created_by = $1 and d.organization_id = any($2::uuid[])
    order by d.updated_at desc`, [actor.userId, orgIds]);
  const list = dashboards.rows as { id: string; name: string; organization_name: string; updated_at: Date | string; chart_count: number }[];
  if (!list.length) return [];
  const tiles = await insightQuery("charts.dashboardTiles", `select t.dashboard_id, t.layout_json, t.type, t.preview_json from (
      select i.dashboard_id, i.layout_json, ${TYPE_SQL} as type, c.preview_json, i.position, i.created_at,
        row_number() over (partition by i.dashboard_id order by i.position, i.created_at) as rn
      from insight_core.core_dashboard_items i
      join insight_core.core_charts c on c.id = i.chart_id and c.organization_id = i.organization_id
      where i.dashboard_id = any($1::uuid[]) and i.organization_id = any($2::uuid[]) and c.created_by = $3
    ) t where t.rn <= 6 order by t.dashboard_id, t.position, t.created_at`,
    [list.map((dashboard) => dashboard.id), orgIds, actor.userId]);
  const byDashboard = new Map<string, GalleryDashboard["tiles"]>();
  for (const row of tiles.rows as { dashboard_id: string; layout_json: GalleryDashboard["tiles"][number]["layout"]; type: ChartSnapshotType; preview_json: unknown }[]) {
    const items = byDashboard.get(row.dashboard_id) ?? [];
    items.push({ layout: row.layout_json, type: row.type, snapshot: thumbnailSnapshot(readSnapshot(row.preview_json), 40) });
    byDashboard.set(row.dashboard_id, items);
  }
  await logDuration("charts.dashboardGallery", started, { count: list.length });
  return list.map((dashboard) => ({
    id: dashboard.id, name: dashboard.name, organizationName: dashboard.organization_name,
    chartCount: dashboard.chart_count, updatedAt: new Date(dashboard.updated_at).toISOString(),
    tiles: byDashboard.get(dashboard.id) ?? [],
  }));
}
