import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createDashboardAndEdit } from "./actions";

export default async function DashboardsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dashboards")
    .select("id, name, created_at, dashboard_items(count)")
    .order("created_at", { ascending: false });

  const dashboards =
    (data as { id: string; name: string; dashboard_items: { count: number }[] }[] | null) ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboards</h1>
          <p className="mt-1 text-muted-foreground">Tableros con varias gráficas y filtros.</p>
        </div>
        <form action={createDashboardAndEdit} className="flex gap-2">
          <input
            name="name"
            placeholder="Nombre del dashboard"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            + Crear
          </button>
        </form>
      </div>

      {dashboards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-12 text-center">
          <p className="text-sm font-medium text-foreground">Aún no tienes dashboards</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea uno y agrega tus gráficas en un grid.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((d) => (
            <Link
              key={d.id}
              href={`/dashboards/${d.id}`}
              className="rounded-xl border border-border bg-card p-5 transition hover:border-primary"
            >
              <div className="font-medium text-card-foreground">{d.name}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {d.dashboard_items?.[0]?.count ?? 0} gráficas
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
