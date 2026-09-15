"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Column } from "@/lib/csv";

export type IngestResult = { datasetId: string } | { error: string };

export async function ingestDataset(
  name: string,
  columns: Column[],
  rows: Record<string, string>[],
): Promise<IngestResult> {
  if (!columns.length) return { error: "No hay columnas para importar." };
  if (rows.length > 100_000)
    return { error: "El archivo excede el límite del MVP (100,000 filas)." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ingest_dataset", {
    p_name: name,
    p_columns: columns,
    p_rows: rows,
  });

  if (error) return { error: error.message };

  revalidatePath("/datasets");
  revalidatePath("/dashboard");
  return { datasetId: data as string };
}
