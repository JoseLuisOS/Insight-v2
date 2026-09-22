import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthBackdrop } from "@/components/auth-backdrop";
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050b18] px-4 text-white">
      <AuthBackdrop />

      <div className="relative z-10 w-full max-w-md animate-[fade-in_0.6s_ease-out] rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mb-6 flex justify-center">
          <Image
            src="/images/brand/logo-intersel.webp"
            alt="Intersel"
            width={208}
            height={132}
            className="h-9 w-auto"
          />
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tight text-white">
          Crea la primera organización
        </h1>
        <p className="mt-1.5 text-center text-sm text-white/60">
          Todavía no existe ninguna. Como sysadmin, puedes crear esta —
          serás su Owner. Las siguientes organizaciones se crearán desde un
          gestor dedicado (próximamente), no desde aquí.
        </p>

        {error && (
          <p className="mt-5 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <form action={createFirstOrganization} className="mt-7 space-y-4">
          <div>
            <label htmlFor="organization_name" className="mb-1.5 block text-sm font-medium text-white/80">
              Nombre de la organización
            </label>
            <input
              id="organization_name"
              name="organization_name"
              type="text"
              required
              autoFocus
              placeholder="Hermosillo ¿Cómo Vamos?"
              className="auth-input px-3 py-2.5 text-sm"
            />
          </div>
          <SubmitButton
            pendingLabel="Creando..."
            className="w-full rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 px-3 py-2.5 text-sm font-medium text-white shadow-[0_4px_14px_rgba(67,119,188,0.28)] transition hover:shadow-[0_4px_18px_rgba(67,119,188,0.4)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-80"
          >
            Crear y continuar
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
