import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChartEditor } from "@/components/chart-editor";
import { getProfileContext } from "@/lib/auth";
import { fetchDatasetData } from "@/lib/datasets";
import { createClient } from "@/lib/supabase/server";
import type { ChartConfig } from "@/lib/charts";

export default async function EditChartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getProfileContext();
  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  const supabase = await createClient();
  const { data: chart } = await supabase
    .from("charts")
    .select("id, name, config_json, dataset_id")
    .eq("id", id)
    .maybeSingle();
  if (!chart) notFound();
  if (!canEdit) redirect(`/charts/${id}`);

  const [{ data: themesData }, { data: metricsData }, { data: mapsData }] =
    await Promise.all([
      supabase.from("themes").select("name, config_json").order("created_at", { ascending: false }),
      supabase.from("metrics").select("id, name, column_key, agg").eq("dataset_id", chart.dataset_id),
      supabase.from("maps").select("id, name, name_property, geojson").order("created_at", { ascending: false }),
    ]);

  const themes = (
    (themesData as { name: string; config_json: { palette?: string[] } }[] | null) ?? []
  ).map((t) => ({ name: t.name, palette: t.config_json.palette ?? [] }));
  const metrics =
    (metricsData as { id: string; name: string; column_key: string; agg: string }[] | null) ?? [];
  const maps =
    (mapsData as { id: string; name: string; name_property: string; geojson: object }[] | null) ?? [];

  const data = chart.dataset_id ? await fetchDatasetData(chart.dataset_id, 5000) : null;
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-danger">No se pudieron cargar los datos de la gráfica.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link href={`/charts/${id}`} className="text-sm text-primary hover:underline">
          ← Volver a la gráfica
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Editar gráfica</h1>
        <p className="mt-1 text-muted-foreground">Datos: {data.name}</p>
      </div>
      {data.error ? (
        <pre className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{data.error}</pre>
      ) : (
        <ChartEditor
          datasetId={data.id}
          datasetName={data.name}
          columns={data.columns}
          rows={data.rows}
          themes={themes}
          metrics={metrics}
          maps={maps}
          chartId={chart.id}
          initialName={chart.name}
          initialConfig={chart.config_json as ChartConfig}
        />
      )}
    </div>
  );
}
