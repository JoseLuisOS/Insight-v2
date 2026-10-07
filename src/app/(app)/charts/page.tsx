import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { insightDb } from "@/lib/insight-db";
import { chartOrganizations } from "@/lib/chart-v2-datasets";
import { getSessionUser } from "@/lib/session-user";

type ChartRow = {
  id: string;
  name: string;
  type: string;
  datasets: { name: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  kpi: "KPI",
  bar: "Barras",
  line: "Línea",
  area: "Área",
  pie: "Pastel",
  table: "Tabla",
};

export default async function ChartsPage() {
  const supabase = await createClient();
  const user = await getSessionUser();
  const organizations = user ? await chartOrganizations() : [];
  const newCharts: { id: string; name: string; type: string; source_name: string; source_kind: "survey" | "dataset" }[] = user ? (await insightDb().query(
    `select c.id, c.name, c.source_kind,
        case when c.source_kind = 'survey' then c.definition_json->>'type'
          else c.definition_json->'chart'->>'type' end as type,
        coalesce(i.name, d.name) as source_name
      from insight_core.core_charts c
      left join insight_survey.survey_instruments i
        on c.source_kind = 'survey' and i.id = c.source_id and i.organization_id = c.organization_id
      left join insight_core.core_datasets d
        on c.source_kind = 'dataset' and d.id = c.source_id and d.organization_id = c.organization_id
      where c.created_by = $1 and c.organization_id = any($2::uuid[])
      order by c.created_at desc`, [user.id, organizations.map((organization) => organization.id)])).rows : [];
  const { data } = await supabase
    .from("charts")
    .select("id, name, type, datasets(name)")
    .order("created_at", { ascending: false });

  const charts = (data as ChartRow[] | null) ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Gráficas</h1>
          <p className="mt-1 text-muted-foreground">Tus visualizaciones guardadas.</p>
        </div>
        <Link
          href="/charts/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          + Nueva gráfica
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/charts/survey/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">+ Gráfica de Encuestas</Link>
        <Link href="/charts/dataset/new" className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Gráfica de Dataset</Link>
      </div>

      {newCharts.length > 0 && <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Gráficas v2</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{newCharts.map((chart) =>
          <Link key={chart.id} href={`/charts/${chart.source_kind}/${chart.id}`} className="rounded-xl border border-border bg-card p-5 hover:border-primary">
            <div className="font-medium">{chart.name}</div>
            <div className="mt-2 text-xs text-muted-foreground">{chart.source_kind === "survey" ? "Encuesta" : "Dataset"} · {chart.source_name} · {chart.type}</div>
          </Link>)}</div>
      </section>}

      {charts.length === 0 && newCharts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-12 text-center">
          <p className="text-sm font-medium text-foreground">Aún no tienes gráficas</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea una a partir de cualquier dataset.
          </p>
          <Link
            href="/charts/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Nueva gráfica
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {charts.map((c) => (
            <Link
              key={c.id}
              href={`/charts/${c.id}`}
              className="rounded-xl border border-border bg-card p-5 transition hover:border-primary"
            >
              <div className="font-medium text-card-foreground">{c.name}</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                  {TYPE_LABEL[c.type] ?? c.type}
                </span>
                <span>{c.datasets?.name}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
