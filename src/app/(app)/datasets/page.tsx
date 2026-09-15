import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type DatasetRow = {
  id: string;
  name: string;
  kind: string;
  row_count: number;
  columns_json: { name: string; key: string; type: string }[];
  created_at: string;
};

export default async function DatasetsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("datasets")
    .select("id, name, kind, row_count, columns_json, created_at")
    .order("created_at", { ascending: false });

  const datasets = (data as DatasetRow[] | null) ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Datasets</h1>
          <p className="mt-1 text-muted-foreground">
            Tus fuentes de datos para crear gráficas.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/query/new"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Constructor visual
          </Link>
          <Link
            href="/datasets/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            + Nuevo dataset
          </Link>
        </div>
      </div>

      {datasets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-12 text-center">
          <p className="text-sm font-medium text-foreground">
            Aún no tienes datasets
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube tu primer CSV para empezar a visualizar tus datos.
          </p>
          <Link
            href="/datasets/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Subir un CSV
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map((d) => (
            <Link
              key={d.id}
              href={`/datasets/${d.id}`}
              className="rounded-xl border border-border bg-card p-5 transition hover:border-primary"
            >
              <div className="font-medium text-card-foreground">{d.name}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {d.row_count.toLocaleString("es-MX")} filas ·{" "}
                {d.columns_json?.length ?? 0} columnas
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(d.columns_json ?? []).slice(0, 4).map((c) => (
                  <span
                    key={c.key}
                    className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
