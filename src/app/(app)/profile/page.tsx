import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NameAvatarForm } from "./name-avatar-form";
import { PasswordForm } from "./password-form";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // No generated Supabase types in this project yet (see docs/ARQUITECTURA.md) —
  // the RPC's actual shape is declared in scripts/008_public_profile_rpc.sql.
  const { data: profile } = (await supabase
    .rpc("get_my_profile")
    .maybeSingle()) as { data: { display_name: string | null; avatar_url: string | null } | null };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Mi perfil</h1>
        <p className="mt-1 text-muted-foreground">
          Administra tu nombre, foto y contraseña.
        </p>
      </div>

      {success === "password" && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Contraseña actualizada.
        </p>
      )}
      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-card-foreground">Nombre y foto</h2>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-5">
          <NameAvatarForm
            userId={user.id}
            initialDisplayName={profile?.display_name ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? null}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-card-foreground">Contraseña</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elige una contraseña nueva. No hace falta la actual.
        </p>
        <div className="mt-5">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
