import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getProfileContext } from "@/lib/auth";
import { createTenant } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { user, profile } = await getProfileContext();

  if (!user) redirect("/login");
  if (profile) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Brand className="text-lg" />
        </div>
        <h1 className="mb-1 text-center text-xl font-semibold text-card-foreground">
          Crea tu organización
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Este será tu espacio de trabajo. Tú serás el administrador.
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <form action={createTenant} className="space-y-4">
          <div>
            <label htmlFor="tenant_name" className="mb-1 block text-sm font-medium">
              Nombre de la organización
            </label>
            <input
              id="tenant_name"
              name="tenant_name"
              type="text"
              required
              placeholder="Mi Empresa S.A. de C.V."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="display_name" className="mb-1 block text-sm font-medium">
              Tu nombre <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              placeholder="Arturo Díaz"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Crear y continuar
          </button>
        </form>
      </div>
    </main>
  );
}
