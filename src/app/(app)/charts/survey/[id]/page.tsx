import Link from "next/link";
import { notFound } from "next/navigation";
import { insightDb } from "@/lib/insight-db";
import { surveyChartContext } from "@/lib/insight-charts";
import { listChartSourceCatalog, loadChartSourceData } from "@/lib/chart-sources";
import { validateChartV2, type ChartV2Definition } from "@/lib/chart-v2";
import { ChartStudio } from "@/components/charts/chart-studio";
import { SurveyChartPublication } from "@/components/survey-chart-publication";
import { ChartV2Annotations } from "@/components/chart-v2-annotations";
import { getSessionUser } from "@/lib/session-user";
import type { ChartVisibility } from "@/lib/chart-snapshot";

export const metadata = { title: "Gráficas · Editor · Intersel Insight" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function SurveyChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const user = await getSessionUser();
  if (!user) notFound();
  const chart = await insightDb().query(
    `select id, name, organization_id, visibility, definition_json from insight_core.core_charts where id = $1 and created_by = $2 and source_kind = 'survey'`, [id, user.id]);
  const row = chart.rows[0] as { id: string; name: string; organization_id: string; visibility: ChartVisibility; definition_json: ChartV2Definition } | undefined;
  if (!row) notFound();
  const definition = validateChartV2(row.definition_json);
  const context = await surveyChartContext(definition.source.instrumentId, definition.source.versionId);
  if (context.detail.survey.organization_id !== row.organization_id) notFound();
  const [catalog, initialSource, publications, annotations] = await Promise.all([
    listChartSourceCatalog(),
    loadChartSourceData({ kind: "survey", instrumentId: definition.source.instrumentId, versionId: definition.source.versionId }, undefined, { definition }),
    insightDb().query(
      `select id, token, published_at from insight_core.core_chart_publications
        where organization_id = $1 and chart_id = $2 and revoked_at is null order by published_at desc`,
      [row.organization_id, id]),
    insightDb().query(`select id, body, created_at from insight_core.core_chart_annotations
      where organization_id = $1 and chart_id = $2 order by created_at desc`, [row.organization_id, id]),
  ]);
  return <div className="w-full px-1 pb-8">
    <div className="mb-5"><Link href="/charts" className="text-sm text-primary hover:underline">← Gráficas</Link>
      <h1 className="mt-2 text-2xl font-semibold">{row.name}</h1></div>
    <ChartStudio key={id} chartId={id} initialName={row.name} initialVisibility={row.visibility} catalog={catalog} initialSource={initialSource}
      initialRef={{ kind: "survey", instrumentId: definition.source.instrumentId, versionId: definition.source.versionId }} />
    <SurveyChartPublication chartId={id} initial={(publications.rows as { id: string; token: string; published_at: string }[]).map((item) => ({ id: item.id, token: item.token, publishedAt: item.published_at }))} />
    <ChartV2Annotations chartId={id} initial={annotations.rows as { id: string; body: string; created_at: string }[]} />
  </div>;
}
