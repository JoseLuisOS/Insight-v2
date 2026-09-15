import { SqlLab } from "@/components/sql-lab";
import { createClient } from "@/lib/supabase/server";

export default async function SqlPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("datasets")
    .select("id, name, physical_table")
    .eq("kind", "csv_materialized")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">SQL Lab</h1>
        <p className="mt-1 text-muted-foreground">
          Consulta tus datos con SQL. Sólo lectura, aislado a tu organización y limitado
          a 5,000 filas por consulta.
        </p>
      </div>
      <SqlLab datasets={data ?? []} />
    </div>
  );
}
