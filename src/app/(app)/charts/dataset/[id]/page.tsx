import Link from "next/link";
import { notFound } from "next/navigation";
import { chartActor, getCoreDataset } from "@/lib/chart-v2-datasets";
import { listChartSourceCatalog, loadChartSourceData } from "@/lib/chart-sources";
import { insightDb } from "@/lib/insight-db";
import { ChartStudio } from "@/components/charts/chart-studio";
import { SurveyChartPublication } from "@/components/survey-chart-publication";
import { ChartV2Annotations } from "@/components/chart-v2-annotations";
import type { ChartConfig } from "@/lib/charts";
import type { ChartVisibility } from "@/lib/chart-snapshot";

export const metadata = { title: "Gráficas · Editor · Intersel Insight" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function DatasetChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const actor = await chartActor();
  const chart = await insightDb().query(`select id, organization_id, source_id, name, visibility, definition_json
    from insight_core.core_charts where id = $1 and created_by = $2 and source_kind = 'dataset'`, [id, actor.userId]);
  const row = chart.rows[0] as { id: string; organization_id: string; source_id: string; name: string; visibility: ChartVisibility;
    definition_json: { version: number; chart: ChartConfig } } | undefined;
  if (!row || row.definition_json?.version !== 2) notFound();
  const data = await getCoreDataset(row.source_id);
  if (data.organization_id !== row.organization_id) notFound();
  const ref = { kind: "dataset" as const, datasetId: row.source_id };
  const [catalog, initialSource, publication, annotations] = await Promise.all([
    listChartSourceCatalog(),
    loadChartSourceData(ref, undefined, { config: row.definition_json.chart }),
    insightDb().query(`select id, token, published_at from insight_core.core_chart_publications
      where organization_id = $1 and chart_id = $2 and revoked_at is null order by published_at desc`, [row.organization_id, id]),
    insightDb().query(`select id, body, created_at from insight_core.core_chart_annotations
      where organization_id = $1 and chart_id = $2 order by created_at desc`, [row.organization_id, id]),
  ]);
  return <div className="w-full px-1 pb-8"><div className="mb-5"><Link href="/charts" className="text-sm text-primary hover:underline">← Gráficas</Link>
    <h1 className="mt-2 text-2xl font-semibold">{row.name}</h1></div>
    <ChartStudio key={id} chartId={id} initialName={row.name} initialVisibility={row.visibility} catalog={catalog} initialSource={initialSource} initialRef={ref} />
    <SurveyChartPublication source="dataset" chartId={id} initial={(publication.rows as { id: string; token: string; published_at: string }[]).map((item) => ({
      id: item.id, token: item.token, publishedAt: item.published_at,
    }))} />
    <ChartV2Annotations chartId={id} initial={annotations.rows as { id: string; body: string; created_at: string }[]} />
  </div>;
}
