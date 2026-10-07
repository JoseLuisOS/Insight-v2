import Link from "next/link";
import { insightDb } from "@/lib/insight-db";
import { chartActor } from "@/lib/chart-v2-datasets";
import { dashboardV2SurveyFilters, loadDashboardV2 } from "@/lib/dashboard-v2";
import { DashboardV2View } from "@/components/dashboard-v2-view";
import { DashboardV2Controls } from "@/components/dashboard-v2-controls";

export default async function DashboardV2Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dashboard = await loadDashboardV2(id);
  const actor = await chartActor();
  const [charts, publications, surveyFilters] = await Promise.all([
    insightDb().query(`select id, name, source_kind from insight_core.core_charts
      where organization_id = $1 and created_by = $2 order by created_at desc`, [dashboard.organizationId, actor.userId]),
    insightDb().query(`select id, token from insight_core.core_dashboard_publications
      where organization_id = $1 and dashboard_id = $2 and revoked_at is null order by published_at desc`,
      [dashboard.organizationId, dashboard.id]),
    dashboardV2SurveyFilters(dashboard.items),
  ]);
  return <main className="w-full px-1 pb-8"><div className="mb-5"><Link href="/dashboards" className="text-sm text-primary hover:underline">← Dashboards</Link>
    <h1 className="mt-2 text-2xl font-semibold">{dashboard.name}</h1></div>
    <DashboardV2Controls dashboardId={dashboard.id} initialName={dashboard.name} available={charts.rows as { id: string; name: string; source_kind: string }[]}
      items={dashboard.items.map((item) => ({ id: item.id, name: item.name }))}
      initialPublications={publications.rows as { id: string; token: string }[]} />
    {dashboard.items.length ? <DashboardV2View items={dashboard.items} editable dashboardId={dashboard.id}
      surveyFilters={surveyFilters} />
      : <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Añade una gráfica para empezar.</div>}
  </main>;
}
