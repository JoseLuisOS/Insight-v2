import Link from "next/link";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { profile } = await getProfileContext();
  const supabase = await createClient();

  // Counts scoped automatically by RLS to the current tenant.
  const [{ count: datasets }, { count: charts }, { count: dashboards }] =
    await Promise.all([
      supabase.from("datasets").select("*", { count: "exact", head: true }),
      supabase.from("charts").select("*", { count: "exact", head: true }),
      supabase.from("dashboards").select("*", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "Datasets", value: datasets ?? 0 },
    { label: "Gráficas", value: charts ?? 0 },
    { label: "Dashboards", value: dashboards ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold text-foreground">
        Hola{profile?.display_name ? `, ${profile.display_name}` : ""} 👋
      </h1>
      <p className="mt-1 text-muted-foreground">
        Bienvenido a {profile?.tenants?.name}. Este es tu panel de control.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="text-3xl font-bold text-primary">{s.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center">
        <p className="text-sm font-medium text-foreground">
          {(datasets ?? 0) === 0
            ? "Empieza subiendo tu primer dataset"
            : "Crea más datasets o empieza a graficar"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube un CSV o pega una tabla para tener datos listos en segundos.
        </p>
        <Link
          href="/datasets/new"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Subir un CSV
        </Link>
      </div>
    </div>
  );
}
