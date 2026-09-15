import Link from "next/link";
import { Brand } from "@/components/brand";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const { user, profile } = await getProfileContext();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invite", { p_token: token });
  const invite = data as { valid: boolean; tenant_name: string; role: string } | null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <Brand className="text-lg" />
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {!invite || !invite.valid ? (
          <>
            <h1 className="text-xl font-semibold text-card-foreground">Invitación no válida</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Este enlace no existe, expiró o ya fue usado.
            </p>
          </>
        ) : !user ? (
          <>
            <h1 className="text-xl font-semibold text-card-foreground">
              Te invitaron a {invite.tenant_name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Crea una cuenta o inicia sesión y vuelve a abrir este enlace para unirte como{" "}
              <strong>{invite.role}</strong>.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/login?mode=signup"
                className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Crear cuenta
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
              >
                Iniciar sesión
              </Link>
            </div>
          </>
        ) : profile ? (
          <>
            <h1 className="text-xl font-semibold text-card-foreground">
              Ya perteneces a una organización
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No puedes unirte a otra con esta cuenta.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Ir a mi panel
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-card-foreground">
              Unirte a {invite.tenant_name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Te unirás como <strong>{invite.role}</strong>.
            </p>
            <form action={acceptInvite} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Unirme
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
