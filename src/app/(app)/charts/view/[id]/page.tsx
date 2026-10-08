import { cache } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadSharedChart } from "@/lib/chart-gallery";
import { snapshotDefinition } from "@/lib/chart-snapshot";
import { SurveyChartRenderer } from "@/components/survey-chart-renderer";
import { DuplicateChartButton } from "@/components/charts/duplicate-chart-button";

const load = cache(loadSharedChart);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const chart = await load((await params).id);
  return { title: `Gráficas · ${chart.name} · Intersel Insight` };
}

export default async function SharedChartPage({ params }: { params: Promise<{ id: string }> }) {
  const chart = await load((await params).id);
  if (chart.owner) redirect(`/charts/${chart.sourceKind}/${chart.id}`);
  const { snapshot } = chart;
  const date = snapshot ? new Date(snapshot.generatedAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : null;
  return <div className="mx-auto w-full max-w-6xl px-1 pb-10">
    <Link href="/charts" className="text-sm text-primary hover:underline">← Gráficas</Link>
    <header className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{chart.name}</h1>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">Solo lectura</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {chart.authorName} · {chart.organizationName} · {chart.sourceKind === "survey" ? "Encuesta" : "Dataset"}: {chart.sourceName}
          {date && ` · Datos al ${date}`}
        </p>
      </div>
      {chart.canDuplicate && <DuplicateChartButton chartId={chart.id} />}
    </header>
    {snapshot ? <>
      <SurveyChartRenderer definition={snapshotDefinition(snapshot)} name={chart.name} height={480} exportable
        result={{ points: snapshot.points, observationCount: 0, base: 0, shownCount: snapshot.points.length, note: snapshot.note }} />
      {snapshot.type === "map" && <p className="mt-2 text-xs text-muted-foreground">El mapa se muestra como ranking de regiones; la vista geográfica está disponible en el editor del autor.</p>}
    </> : <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">El autor aún no ha generado la vista de esta gráfica.</div>}
  </div>;
}
