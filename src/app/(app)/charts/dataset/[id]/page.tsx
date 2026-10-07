import Link from "next/link";
import { notFound } from "next/navigation";
import { chartActor, getCoreDataset, listCoreChartMaps } from "@/lib/chart-v2-datasets";
import { insightDb } from "@/lib/insight-db";
import { ChartEditor } from "@/components/chart-editor";
import { SurveyChartPublication } from "@/components/survey-chart-publication";
import { ChartV2Annotations } from "@/components/chart-v2-annotations";
import type { ChartConfig } from "@/lib/charts";
import { ChartMapUpload } from "@/components/chart-map-upload";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function DatasetChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const actor = await chartActor();
  const chart = await insightDb().query(`select id, organization_id, source_id, name, definition_json
    from insight_core.core_charts where id = $1 and created_by = $2 and source_kind = 'dataset'`, [id, actor.userId]);
  const row = chart.rows[0] as { id: string; organization_id: string; source_id: string; name: string;
    definition_json: { version: number; chart: ChartConfig } } | undefined;
  if (!row || row.definition_json?.version !== 2) notFound();
  const data = await getCoreDataset(row.source_id);
  if (data.organization_id !== row.organization_id) notFound();
  const maps = await listCoreChartMaps(data.organization_id);
  const [publication, annotations] = await Promise.all([
    insightDb().query(`select id, token, published_at from insight_core.core_chart_publications
      where organization_id = $1 and chart_id = $2 and revoked_at is null order by published_at desc`, [row.organization_id, id]),
    insightDb().query(`select id, body, created_at from insight_core.core_chart_annotations
      where organization_id = $1 and chart_id = $2 order by created_at desc`, [row.organization_id, id]),
  ]);
  return <div className="w-full px-1 pb-8"><div className="mb-5"><Link href="/charts" className="text-sm text-primary hover:underline">← Gráficas</Link>
    <h1 className="mt-2 text-2xl font-semibold">{row.name}</h1><p className="mt-1 text-sm text-muted-foreground">Dataset: {data.name}</p></div>
    <ChartEditor coreDataset chartId={id} initialName={row.name} initialConfig={row.definition_json.chart}
      datasetId={data.id} datasetName={data.name} columns={data.columns} rows={data.rows}
      maps={maps.map((map) => ({ id: map.id, name: map.name, name_property: map.name_property, geojson: map.geojson }))} />
    <ChartMapUpload organizationId={data.organization_id} />
    <SurveyChartPublication source="dataset" chartId={id} initial={(publication.rows as { id: string; token: string; published_at: string }[]).map((item) => ({
      id: item.id, token: item.token, publishedAt: item.published_at,
    }))} />
    <ChartV2Annotations chartId={id} initial={annotations.rows as { id: string; body: string; created_at: string }[]} />
  </div>;
}
