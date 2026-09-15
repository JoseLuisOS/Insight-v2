import { MetricManager } from "@/components/metric-manager";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function MetricsPage() {
  const { profile } = await getProfileContext();
  const supabase = await createClient();

  const [{ data: datasetsData }, { data: metricsData }] = await Promise.all([
    supabase
      .from("datasets")
      .select("id, name, columns_json")
      .eq("kind", "csv_materialized")
      .order("created_at", { ascending: false }),
    supabase
      .from("metrics")
      .select("id, name, agg, column_key, description, datasets(name)")
      .order("created_at", { ascending: false }),
  ]);

  const datasets = (
    (datasetsData as { id: string; name: string; columns_json: { key: string; name: string; type: string }[] }[] | null) ??
    []
  ).map((d) => ({ id: d.id, name: d.name, columns: d.columns_json ?? [] }));

  const canWrite = profile?.role === "admin" || profile?.role === "editor";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground">Métricas</h1>
      <p className="mt-1 text-muted-foreground">
        Capa semántica: define una métrica una vez y reúsala en tus gráficas con consistencia.
      </p>
      <div className="mt-6">
        <MetricManager
          datasets={datasets}
          metrics={
            (metricsData as never) ?? []
          }
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}
