import type { Metadata } from "next";
import { listDashboardGallery } from "@/lib/chart-gallery";
import { chartOrganizations } from "@/lib/chart-v2-datasets";
import { DashboardGallery } from "@/components/charts/dashboard-gallery";
import { NewDashboardButton } from "@/components/charts/new-dashboard-dialog";

export const metadata: Metadata = { title: "Dashboards · Galería · Intersel Insight" };

function EmptyIllustration() {
  return (
    <svg viewBox="0 0 240 150" role="img" aria-label="Cuadrícula de cuatro paneles con gráficas" className="mx-auto mb-6 h-36 w-auto">
      <rect x="8" y="8" width="108" height="64" rx="8" className="fill-muted stroke-border" />
      <g className="text-primary" fill="currentColor">
        <rect x="24" y="44" width="12" height="18" rx="2" /><rect x="44" y="32" width="12" height="30" rx="2" />
        <rect x="64" y="38" width="12" height="24" rx="2" /><rect x="84" y="24" width="12" height="38" rx="2" />
      </g>
      <rect x="124" y="8" width="108" height="64" rx="8" className="fill-muted stroke-border" />
      <polyline points="138,58 160,40 182,48 204,24 220,30" fill="none" stroke="currentColor" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" className="text-accent-teal" />
      <rect x="8" y="80" width="108" height="62" rx="8" className="fill-muted stroke-border" />
      <g className="text-accent-violet" fill="none" stroke="currentColor" strokeWidth="12">
        <circle cx="62" cy="111" r="18" strokeOpacity="0.35" />
        <circle cx="62" cy="111" r="18" strokeDasharray="70 114" transform="rotate(-90 62 111)" />
      </g>
      <rect x="124" y="80" width="108" height="62" rx="8" className="fill-muted stroke-border" />
      <g className="text-primary" fill="currentColor">
        <rect x="142" y="98" width="48" height="8" rx="4" opacity="0.5" /><rect x="142" y="114" width="72" height="14" rx="4" />
      </g>
    </svg>
  );
}

export default async function DashboardsPage() {
  const [dashboards, organizations] = await Promise.all([listDashboardGallery(), chartOrganizations()]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-1 pb-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboards</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tableros que reúnen tus gráficas con filtros compartidos.</p>
        </div>
        {dashboards.length > 0 && <NewDashboardButton organizations={organizations} />}
      </div>
      {dashboards.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card px-6 py-14 text-center">
          <EmptyIllustration />
          <h2 className="text-xl font-semibold text-foreground">Reúne tus gráficas en un tablero</h2>
          <p className="mx-auto mb-6 mt-2 max-w-md text-sm text-muted-foreground">
            Combina gráficas de encuestas y datasets, ordénalas en una cuadrícula y filtra todo a la vez.
          </p>
          <NewDashboardButton organizations={organizations} variant="hero" label="Crear mi primer dashboard" />
        </div>
      ) : (
        <DashboardGallery dashboards={dashboards} />
      )}
    </div>
  );
}
