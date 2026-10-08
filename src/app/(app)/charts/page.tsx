import type { Metadata } from "next";
import { listChartGallery } from "@/lib/chart-gallery";
import { ChartGallery } from "@/components/charts/chart-gallery";
import { GalleryEmpty } from "@/components/charts/gallery-empty";
import { NewChartButton } from "@/components/charts/new-chart-button";

export const metadata: Metadata = { title: "Gráficas · Galería · Intersel Insight" };

export default async function ChartsPage() {
  const charts = await listChartGallery();
  return (
    <div className="mx-auto w-full max-w-[1400px] px-1 pb-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gráficas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Explora tus visualizaciones y las que tu equipo comparte.</p>
        </div>
        {charts.length > 0 && <NewChartButton />}
      </div>
      {charts.length === 0 ? <GalleryEmpty /> : <ChartGallery charts={charts} />}
    </div>
  );
}
