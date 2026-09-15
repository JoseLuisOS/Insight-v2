import { ExternalSources } from "@/components/external-sources";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SourcesPage() {
  const { profile } = await getProfileContext();
  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-foreground">Fuentes de datos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Solo un administrador puede gestionar fuentes externas.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("data_sources")
    .select("id, name")
    .eq("type", "external_pg")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-foreground">Fuentes de datos</h1>
      <p className="mt-1 text-muted-foreground">
        Conecta una base Postgres externa (solo lectura) e importa tablas o consultas como
        datasets.
      </p>
      <div className="mt-6">
        <ExternalSources sources={(data as { id: string; name: string }[] | null) ?? []} />
      </div>
    </div>
  );
}
