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
    const { data } = await supabase
      .from("datasets")
      .select("id, name, row_count, kind")
      .order("created_at", { ascending: false });
    const datasets = data ?? [];

    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-foreground">Nueva gráfica</h1>
        <p className="mt-1 text-muted-foreground">Elige un dataset para empezar.</p>
        {datasets.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Primero necesitas un dataset.
            </p>
            <Link
              href="/datasets/new"
              className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Crear dataset
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {datasets.map((d) => (
              <Link
                key={d.id}
                href={`/charts/new?dataset=${d.id}`}
                className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
              >
                <div className="font-medium text-card-foreground">{d.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {d.kind === "sql_query"
                    ? "Consulta SQL"
                    : `${(d.row_count ?? 0).toLocaleString("es-MX")} filas`}
                </div>
              </Link>
            ))}
          </div>
        )}
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
