import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { createFirstOrganization } from "./actions";

/**
 * Only reachable when the installation has zero organizations AND the
 * viewer is the platform admin — everyone else is routed elsewhere before
 * they ever see this (src/app/(app)/layout.tsx). Organizations are
 * otherwise admin-assigned, not self-service; a real organization manager
 * is separate, later work (see docs/LOG.md 2026-09-22).
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: status } = await supabase.rpc("get_org_bootstrap_status");
  if (!(status?.organization_count === 0 && status?.is_platform_admin)) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Brand className="text-lg" />
        </div>
        <h1 className="mb-1 text-center text-xl font-semibold text-card-foreground">
          Crea la primera organización
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Todavía no existe ninguna. Como sysadmin, puedes crear esta —
          serás su Owner. Las siguientes organizaciones se crearán desde un
          gestor dedicado (próximamente), no desde aquí.
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <form action={createFirstOrganization} className="space-y-4">
          <div>
            <label htmlFor="organization_name" className="mb-1 block text-sm font-medium">
              Nombre de la organización
            </label>
            <input
              id="organization_name"
              name="organization_name"
              type="text"
              required
              placeholder="Hermosillo ¿Cómo Vamos?"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <SubmitButton
            pendingLabel="Creando..."
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Crear y continuar
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
