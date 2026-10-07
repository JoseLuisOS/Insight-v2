import Link from "next/link";
import { ChartEditor } from "@/components/chart-editor";
import { fetchDatasetData } from "@/lib/datasets";
import { createClient } from "@/lib/supabase/server";

export default async function NewChartPage({
  searchParams,
}: {
  searchParams: Promise<{ dataset?: string }>;
}) {
  const { dataset } = await searchParams;
  const supabase = await createClient();

  if (!dataset) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-foreground">Nueva gráfica</h1>
        <p className="mt-1 text-muted-foreground">Elige la fuente de datos para empezar.</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/charts/survey/new" className="rounded-xl border border-border bg-card p-5 transition hover:border-primary">
            <div className="font-medium text-card-foreground">Encuestas</div><div className="mt-1 text-sm text-muted-foreground">Analiza preguntas, cruces, distribuciones y estadística por versión.</div>
          </Link>
          <Link href="/charts/dataset/new" className="rounded-xl border border-border bg-card p-5 transition hover:border-primary">
            <div className="font-medium text-card-foreground">Datasets</div><div className="mt-1 text-sm text-muted-foreground">Crea gráficas con datos tabulares nuevos o ya cargados.</div>
          </Link>
        </div>
      </div>
    );
  }

  const { data: themesData } = await supabase
    .from("themes")
    .select("name, config_json")
    .order("created_at", { ascending: false });
  const themes = (
    (themesData as { name: string; config_json: { palette?: string[] } }[] | null) ?? []
  ).map((t) => ({ name: t.name, palette: t.config_json.palette ?? [] }));

  const { data: metricsData } = await supabase
    .from("metrics")
    .select("id, name, column_key, agg")
    .eq("dataset_id", dataset);
  const metrics =
    (metricsData as { id: string; name: string; column_key: string; agg: string }[] | null) ?? [];

  const { data: mapsData } = await supabase
    .from("maps")
    .select("id, name, name_property, geojson")
    .order("created_at", { ascending: false });
  const maps =
    (mapsData as { id: string; name: string; name_property: string; geojson: object }[] | null) ?? [];

  const data = await fetchDatasetData(dataset, 5000);
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-danger">Dataset no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link href="/charts" className="text-sm text-primary hover:underline">
          ← Gráficas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Nueva gráfica</h1>
      </div>
      {data.error ? (
        <pre className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {data.error}
        </pre>
      ) : (
        <ChartEditor
          datasetId={data.id}
          datasetName={data.name}
          columns={data.columns}
          rows={data.rows}
          themes={themes}
          metrics={metrics}
          maps={maps}
        />
      )}
    </div>
  );
}
