import { notFound } from "next/navigation";
import { insightDb } from "@/lib/insight-db";
import { DashboardV2View } from "@/components/dashboard-v2-view";
import type { DashboardV2Item } from "@/lib/dashboard-v2";

export default async function PublicDashboardV2Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();
  const query = await insightDb().query(`select snapshot_json from insight_core.core_dashboard_publications
    where token = $1 and revoked_at is null`, [token]);
  const snapshot = (query.rows[0] as { snapshot_json?: { kind: string; name: string; items: DashboardV2Item[]; generatedAt: string } } | undefined)?.snapshot_json;
  if (!snapshot || snapshot.kind !== "dashboard_v2") notFound();
  return <main className="mx-auto max-w-7xl px-4 py-10"><h1 className="text-2xl font-semibold">{snapshot.name}</h1>
    <p className="mt-1 text-xs text-muted-foreground">Datos al {new Date(snapshot.generatedAt).toLocaleString("es-MX")}</p>
    <div className="mt-6"><DashboardV2View items={snapshot.items} /></div>
  </main>;
}
