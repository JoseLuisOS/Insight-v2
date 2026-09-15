import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardEditor } from "@/components/dashboard-editor";
import { createClient } from "@/lib/supabase/server";
import type { ChartConfig } from "@/lib/charts";

export default async function DashboardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dashboard } = await supabase
    .from("dashboards")
    .select("id, name, layouts_json")
    .eq("id", id)
    .maybeSingle();
  if (!dashboard) notFound();

  const [{ data: items }, { data: filters }, { data: charts }] = await Promise.all([
    supabase
      .from("dashboard_items")
      .select("chart_id, layout_json, charts(name, type)")
      .eq("dashboard_id", id),
    supabase.from("dashboard_filters").select("type, config_json").eq("dashboard_id", id),
    supabase.from("charts").select("id, name, type").order("created_at", { ascending: false }),
  ]);

  const initialItems = (
    (items as unknown as {
      chart_id: string;
      layout_json: { x: number; y: number; w: number; h: number };
      charts: { name: string; type: string } | null;
    }[]) ?? []
  ).map((it) => ({
    id: it.chart_id,
    name: it.charts?.name ?? "Gráfica",
    type: it.charts?.type ?? "bar",
    ...it.layout_json,
  }));

  const initialFilters = (
    (filters as { type: "date_range" | "dropdown"; config_json: { column: string; label?: string } }[]) ?? []
  ).map((f) => ({
    type: f.type,
    column: f.config_json.column ?? "",
    label: f.config_json.label ?? "",
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/dashboards/${id}`} className="text-sm text-primary hover:underline">
          ← Ver
        </Link>
        <span className="text-sm text-muted-foreground">Editando dashboard</span>
      </div>
      <DashboardEditor
        dashboardId={id}
        initialName={dashboard.name}
        initialItems={initialItems}
        initialFilters={initialFilters}
        availableCharts={(charts as { id: string; name: string; type: string }[]) ?? []}
      />
    </div>
  );
}
