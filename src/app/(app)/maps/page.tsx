import { MapManager } from "@/components/map-manager";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function MapsPage() {
  const { profile } = await getProfileContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("maps")
    .select("id, name, name_property")
    .order("created_at", { ascending: false });

  const canWrite = profile?.role === "admin" || profile?.role === "editor";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground">Mapas</h1>
      <p className="mt-1 text-muted-foreground">
        Sube GeoJSON para crear gráficas de mapa (regiones coloreadas por valor).
      </p>
      <div className="mt-6">
        <MapManager
          maps={(data as { id: string; name: string; name_property: string }[] | null) ?? []}
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}
