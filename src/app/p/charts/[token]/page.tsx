import { notFound } from "next/navigation";
import { insightDb } from "@/lib/insight-db";
import { validateChartV2, type ChartV2Result } from "@/lib/chart-v2";
import { SurveyChartRenderer } from "@/components/survey-chart-renderer";
import { ChartRenderer } from "@/components/chart-renderer";
import type { ChartConfig, Row } from "@/lib/charts";

export default async function PublicSurveyChartPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();
  const publication = await insightDb().query(`select snapshot_json from insight_core.core_chart_publications
    where token = $1 and revoked_at is null`, [token]);
  const snapshot = (publication.rows[0] as { snapshot_json?: {
    kind: string; name: string; definition?: unknown; result?: ChartV2Result;
    sourceName?: string; version?: string; generatedAt: string;
    config?: ChartConfig; columns?: string[]; rows?: Row[];
    geo?: { name: string; geojson: object; nameProperty?: string };
  } } | undefined)?.snapshot_json;
  if (!snapshot || !["survey_chart_v2", "dataset_chart_v2"].includes(snapshot.kind)) notFound();
  return <main className="mx-auto max-w-6xl px-4 py-10">
    <h1 className="text-2xl font-semibold">{snapshot.name}</h1>
    <p className="mt-1 text-sm text-muted-foreground">{snapshot.sourceName}{snapshot.version ? ` · versión ${snapshot.version}` : ""} · datos al {new Date(snapshot.generatedAt).toLocaleString("es-MX")}</p>
    <div className="mt-6">{snapshot.kind === "survey_chart_v2" && snapshot.result
      ? <SurveyChartRenderer definition={validateChartV2(snapshot.definition)} result={snapshot.result} name={snapshot.name} height={520} />
      : snapshot.config ? <ChartRenderer config={snapshot.config} rows={snapshot.rows ?? []} columns={snapshot.columns ?? []} geo={snapshot.geo} height={520} exportable exportName={snapshot.name} /> : null}</div>
  </main>;
}
