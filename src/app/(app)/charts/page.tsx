import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

      {charts.length === 0 ? (
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
