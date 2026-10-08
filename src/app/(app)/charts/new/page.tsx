import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { listChartSourceCatalog, loadChartSourceData } from "@/lib/chart-sources";
import { defaultSourceRef, findCatalogSource, type ChartSourceRef } from "@/lib/chart-studio";
import { ChartStudio } from "@/components/charts/chart-studio";

export const metadata = { title: "Gráficas · Nueva gráfica · Intersel Insight" };

export default async function NewChartPage({ searchParams }: {
  searchParams: Promise<{ dataset?: string; instrument?: string; version?: string }>;
}) {
  const { dataset, instrument, version } = await searchParams;
  const catalog = await listChartSourceCatalog();
  let ref: ChartSourceRef | null = null;
  if (dataset) {
    const candidate: ChartSourceRef = { kind: "dataset", datasetId: dataset };
    if (findCatalogSource(catalog, candidate)) ref = candidate;
  }
  if (!ref && instrument) {
    const withVersion: ChartSourceRef = { kind: "survey", instrumentId: instrument, versionId: version };
    if (version && findCatalogSource(catalog, withVersion)) ref = withVersion;
    else {
      const candidate: ChartSourceRef = { kind: "survey", instrumentId: instrument };
      if (findCatalogSource(catalog, candidate)) ref = candidate;
    }
  }
  ref ??= defaultSourceRef(catalog);
  let initialSource: Awaited<ReturnType<typeof loadChartSourceData>> | null = null;
  let loadError = "";
  if (ref) {
    try { initialSource = await loadChartSourceData(ref); }
    catch (error) {
      unstable_rethrow(error);
      loadError = "No se pudo cargar la fuente por defecto. Elige otra en el panel Fuentes.";
    }
  }
  return <div className="w-full px-1 pb-8">
    <div className="mb-5"><Link href="/charts" className="text-sm text-primary hover:underline">← Gráficas</Link>
      <h1 className="mt-2 text-2xl font-semibold">Nueva gráfica</h1>
      {loadError && <p role="alert" className="mt-2 rounded-md bg-danger/10 p-3 text-sm text-danger">{loadError}</p>}</div>
    <ChartStudio catalog={catalog} initialSource={initialSource} initialRef={ref} />
  </div>;
}
