import Link from "next/link";
import { ChartEditor } from "@/components/chart-editor";
import { ChartDatasetUpload } from "@/components/chart-dataset-upload";
import { chartOrganizations, getCoreDataset, listCoreDatasets, listCoreChartMaps } from "@/lib/chart-v2-datasets";
import { ChartMapUpload } from "@/components/chart-map-upload";

export default async function NewDatasetChartPage({ searchParams }: { searchParams: Promise<{ dataset?: string }> }) {
  const { dataset } = await searchParams;
  if (!dataset) {
    const [organizations, datasets] = await Promise.all([chartOrganizations(), listCoreDatasets()]);
    return <div className="mx-auto max-w-5xl">
      <Link href="/charts" className="text-sm text-primary hover:underline">← Gráficas</Link>
      <h1 className="mt-3 text-2xl font-semibold">Nueva gráfica de Dataset</h1>
      <p className="mt-1 text-sm text-muted-foreground">Elige un dataset plano o carga un archivo nuevo.</p>
      {!!datasets.length && <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{datasets.map((item) => <Link key={item.id}
        href={`/charts/dataset/new?dataset=${item.id}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary">
        <div className="font-medium">{item.name}</div><div className="mt-1 text-xs text-muted-foreground">{item.organization_name} · {item.row_count.toLocaleString("es-MX")} filas</div>
      </Link>)}</div>}
      <ChartDatasetUpload organizations={organizations} />
    </div>;
  }
  const data = await getCoreDataset(dataset);
  const maps = await listCoreChartMaps(data.organization_id);
  return <div className="w-full px-1 pb-8">
    <div className="mb-5"><Link href="/charts/dataset/new" className="text-sm text-primary hover:underline">← Cambiar dataset</Link>
      <h1 className="mt-2 text-2xl font-semibold">Nueva gráfica · {data.name}</h1>
      {data.row_count > data.rows.length && <p className="mt-1 text-xs text-muted-foreground">Vista y cálculo sobre las primeras {data.rows.length.toLocaleString("es-MX")} filas, como en Gráficas v1.</p>}</div>
    <ChartEditor coreDataset datasetId={data.id} datasetName={data.name} columns={data.columns} rows={data.rows}
      maps={maps.map((map) => ({ id: map.id, name: map.name, name_property: map.name_property, geojson: map.geojson }))} />
    <ChartMapUpload organizationId={data.organization_id} />
  </div>;
}
