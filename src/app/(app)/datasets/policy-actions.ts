"use server";

import { revalidatePath } from "next/cache";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createRowPolicy(input: {
  datasetId: string;
  columnKey: string;
  principalType: "user" | "role";
  principalId: string;
  allowedValue: string;
}): Promise<{ ok: true } | { error: string }> {
  const { profile } = await getProfileContext();
  if (!profile) return { error: "Sesión no válida." };
  if (!input.columnKey || !input.principalId || !input.allowedValue.trim()) {
    return { error: "Faltan datos de la política." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("dataset_row_policies").insert({
    tenant_id: profile.tenant_id,
    dataset_id: input.datasetId,
    column_key: input.columnKey,
    principal_type: input.principalType,
    principal_id: input.principalId,
    allowed_value: input.allowedValue.trim(),
  });
  if (error) return { error: error.message };
  revalidatePath(`/datasets/${input.datasetId}`);
  return { ok: true };
}

export async function deleteRowPolicy(policyId: string, datasetId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("dataset_row_policies").delete().eq("id", policyId);
  revalidatePath(`/datasets/${datasetId}`);
}
