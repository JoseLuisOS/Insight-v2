import { ThemeManager } from "@/components/theme-manager";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ThemesPage() {
  const { profile } = await getProfileContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("themes")
    .select("id, name, config_json")
    .order("created_at", { ascending: false });

  const canWrite = profile?.role === "admin" || profile?.role === "editor";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground">Temas</h1>
      <p className="mt-1 text-muted-foreground">
        Paletas reutilizables para tus gráficas, con la identidad de tu organización.
      </p>
      <div className="mt-6">
        <ThemeManager
          themes={
            (data as { id: string; name: string; config_json: { palette?: string[] } }[] | null) ??
            []
          }
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}
