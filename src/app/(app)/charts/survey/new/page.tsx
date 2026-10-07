import Link from "next/link";
import { listSurveys } from "@/lib/insight-surveys";
import { surveyChartContext, analyzeSurveyChart } from "@/lib/insight-charts";
import { defaultChartV2 } from "@/lib/chart-v2";
import { SurveyChartStudio } from "@/components/survey-chart-studio";
import { chartOrganizations } from "@/lib/chart-v2-datasets";

export default async function NewSurveyChartPage({ searchParams }: {
  searchParams: Promise<{ instrument?: string; version?: string }>;
}) {
  const { instrument, version } = await searchParams;
  if (!instrument) {
    const [{ surveys, versionsByInstrument }, organizations] = await Promise.all([listSurveys(), chartOrganizations()]);
    const allowed = new Set(organizations.map((organization) => organization.id));
    const visibleSurveys = surveys.filter((survey) => allowed.has(survey.organization_id));
    return <div className="mx-auto max-w-5xl">
      <Link href="/charts" className="text-sm text-primary hover:underline">← Gráficas</Link>
      <h1 className="mt-3 text-2xl font-semibold">Nueva gráfica de Encuestas</h1>
      <p className="mt-1 text-sm text-muted-foreground">Elige un instrumento. Podrás fijar su versión y elegir las variables en el editor.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleSurveys.map((survey) => <Link key={survey.id}
        href={`/charts/survey/new?instrument=${survey.id}`}
        className="rounded-xl border border-border bg-card p-5 hover:border-primary">
        <div className="font-medium">{survey.name}</div><div className="mt-2 text-xs text-muted-foreground">{survey.organization_name} · {survey.study_name} · {versionsByInstrument[survey.id]?.length ?? 0} versiones</div>
      </Link>)}</div>
      {!visibleSurveys.length && <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">No hay encuestas accesibles.</p>}
    </div>;
  }
  const context = await surveyChartContext(instrument, version);
  const first = context.variables[0];
  const definition = first ? defaultChartV2(instrument, context.version.id, first.id) : null;
  const result = definition ? await analyzeSurveyChart(definition) : null;
  return <div className="w-full px-1 pb-8">
    <div className="mb-5"><Link href="/charts/survey/new" className="text-sm text-primary hover:underline">← Cambiar encuesta</Link>
      <h1 className="mt-2 text-2xl font-semibold">Nueva gráfica · {context.detail.survey.name}</h1></div>
    {definition && result ? <SurveyChartStudio instrumentName={context.detail.survey.name}
      versions={context.detail.versions} variables={context.variables} initialDefinition={definition} initialResult={result} />
      : <p className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">Esta versión no tiene variables analíticas disponibles.</p>}
  </div>;
}
