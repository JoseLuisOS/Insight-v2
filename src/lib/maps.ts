import { createClient } from "@/lib/supabase/server";
import type { ChartConfig } from "@/lib/charts";

export type Geo = { name: string; geojson: object; nameProperty?: string };

/** Resolve the GeoJSON for a map-type chart config (or undefined). */
export async function getGeoForConfig(
  supabase: Awaited<ReturnType<typeof createClient>>,
  config: ChartConfig,
): Promise<Geo | undefined> {
  if (config?.type !== "map" || !config.mapId) return undefined;
  const { data: map } = await supabase
    .from("maps")
    .select("id, name_property, geojson")
    .eq("id", config.mapId)
    .maybeSingle();
  if (!map) return undefined;
  return {
    name: `map_${map.id}`,
    geojson: map.geojson as object,
    nameProperty: map.name_property as string,
  };
}
