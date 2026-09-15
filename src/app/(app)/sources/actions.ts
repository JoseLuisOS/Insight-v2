"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addExternalSource(
  name: string,
  connectionString: string,
): Promise<{ ok: true } | { error: string }> {
  if (!connectionString.trim()) return { error: "Falta la cadena de conexión." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("store_external_source", {
    p_name: name,
    p_conn: connectionString,
  });
  if (error) return { error: error.message };
  revalidatePath("/sources");
  return { ok: true };
}

export async function deleteExternalSource(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("delete_external_source", { p_data_source_id: id });
  revalidatePath("/sources");
}
