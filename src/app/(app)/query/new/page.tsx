import Link from "next/link";
import { QueryBuilder } from "@/components/query-builder";
import { createClient } from "@/lib/supabase/server";

export default async function QueryBuilderPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("datasets")
    .select("id, name, physical_table, columns_json")
    .eq("kind", "csv_materialized")
    .order("created_at", { ascending: false });

  const datasets = (
    (data as {
      id: string;
      name: string;
      physical_table: string;
      columns_json: { key: string; name: string; type: string }[];
    }[]) ?? []
  ).map((d) => ({
    id: d.id,
    name: d.name,
    physical_table: d.physical_table,
    columns: d.columns_json ?? [],
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link href="/datasets" className="text-sm text-primary hover:underline">
          ← Datasets
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Constructor de consultas</h1>
        <p className="mt-1 text-muted-foreground">
          Arma una consulta sin escribir SQL: elige columnas, métricas y filtros. Guárdala como
          dataset para graficarla.
        </p>
      </div>
      {datasets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Necesitas al menos un dataset materializado (CSV).
          </p>
          <Link
            href="/datasets/new"
            className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Subir un CSV
          </Link>
        </div>
      ) : (
        <QueryBuilder datasets={datasets} />
      )}
    </div>
  );
}
