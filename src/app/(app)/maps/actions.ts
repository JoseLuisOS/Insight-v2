"use server";

import { revalidatePath } from "next/cache";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createMap(
  name: string,
  geojsonText: string,
  nameProperty: string,
): Promise<{ ok: true } | { error: string }> {
  const { profile } = await getProfileContext();
  if (!profile) return { error: "Sesión no válida." };
  if (!name.trim()) return { error: "Falta el nombre del mapa." };

  let geojson: unknown;
  try {
    geojson = JSON.parse(geojsonText);
  } catch {
    return { error: "El GeoJSON no es JSON válido." };
  }
  const g = geojson as { type?: string; features?: unknown[] };
  if (g?.type !== "FeatureCollection" || !Array.isArray(g.features) || g.features.length === 0) {
    return { error: "Debe ser un GeoJSON FeatureCollection con features." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("maps").insert({
    tenant_id: profile.tenant_id,
    name: name.trim(),
    name_property: nameProperty.trim() || "name",
    geojson,
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/maps");
  return { ok: true };
}

export async function deleteMap(mapId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("maps").delete().eq("id", mapId);
  revalidatePath("/maps");
}
