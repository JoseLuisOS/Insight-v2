import Link from "next/link";
import { notFound } from "next/navigation";
import { AnnotationsPanel } from "@/components/annotations-panel";
import { ChartRenderer } from "@/components/chart-renderer";
import { PublishDialog } from "@/components/publish-dialog";
import {
  getChartPublication,
  getPublicationViewCount,
  publishChart,
} from "@/app/(app)/charts/publish-actions";
import { getProfileContext } from "@/lib/auth";
import { fetchDatasetData } from "@/lib/datasets";
import { createClient } from "@/lib/supabase/server";
import type { ChartConfig } from "@/lib/charts";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function ChartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: chart } = await supabase
    .from("charts")
    .select("id, name, type, config_json, dataset_id")
    .eq("id", id)
    .maybeSingle();

  if (!chart) notFound();

  const data = chart.dataset_id
    ? await fetchDatasetData(chart.dataset_id, 5000)
    : null;
  const config = chart.config_json as ChartConfig;

  const [{ profile }, publication, { data: annData }, { data: profilesData }] =
    await Promise.all([
      getProfileContext(),
      getChartPublication(id),
      supabase
        .from("annotations")
        .select("id, body, created_at, created_by")
        .eq("chart_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, display_name"),
    ]);
  const canPublish = !!(profile?.can_publish || profile?.role === "admin");
  const canWrite = profile?.role === "admin" || profile?.role === "editor";
  const viewCount = publication.token ? await getPublicationViewCount("chart", id) : 0;

  // For map charts, load the GeoJSON to register.
  let geo: { name: string; geojson: object; nameProperty?: string } | undefined;
  if (config.type === "map" && config.mapId) {
    const { data: map } = await supabase
      .from("maps")
      .select("id, name_property, geojson")
      .eq("id", config.mapId)
      .maybeSingle();
    if (map) geo = { name: `map_${map.id}`, geojson: map.geojson as object, nameProperty: map.name_property };
  }

  const nameById = new Map(
    ((profilesData as { id: string; display_name: string | null }[] | null) ?? []).map(
      (p) => [p.id, p.display_name],
    ),
  );
  const annotations = (
    (annData as { id: string; body: string; created_at: string; created_by: string | null }[] | null) ?? []
  ).map((a) => ({ ...a, author: a.created_by ? nameById.get(a.created_by) ?? null : null }));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/charts" className="text-sm text-primary hover:underline">
            ← Gráficas
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{chart.name}</h1>
          {data && (
            <p className="mt-1 text-sm text-muted-foreground">
              Datos: {data.name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Link
              href={`/charts/${id}/edit`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Editar
            </Link>
          )}
          <Link
            href={`/charts/new?dataset=${chart.dataset_id}`}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Nueva similar
          </Link>
        </div>
      </div>

      {!data || data.error ? (
        <pre className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {data?.error ?? "No se pudieron cargar los datos."}
        </pre>
      ) : (
        <ChartRenderer
          config={config}
          rows={data.rows}
          columns={data.columns}
          height={460}
          exportable
          exportName={chart.name}
          geo={geo}
        />
      )}

      <div className="mt-6">
        <AnnotationsPanel chartId={id} annotations={annotations} canWrite={canWrite} />
      </div>

      <div className="mt-6">
        <PublishDialog
          resourceId={id}
          resourceType="chart"
          action={publishChart}
          initial={publication}
          siteUrl={SITE_URL}
          canPublish={canPublish}
          viewCount={viewCount}
        />
      </div>
    </div>
  );
}
