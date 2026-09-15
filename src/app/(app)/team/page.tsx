import { InviteManager } from "@/components/invite-manager";
import { TeamTable } from "@/components/team-table";
import { getProfileContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function TeamPage() {
  const { user, profile } = await getProfileContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, role, can_publish")
    .order("created_at", { ascending: true });

  const members =
    (data as {
      id: string;
      display_name: string | null;
      role: "admin" | "editor" | "viewer";
      can_publish: boolean;
    }[] | null) ?? [];

  const isAdmin = profile?.role === "admin";

  const { data: invitesData } = isAdmin
    ? await supabase
        .from("tenant_invites")
        .select("id, role, token, expires_at, accepted_at")
        .order("created_at", { ascending: false })
    : { data: [] };
  const invites =
    (invitesData as {
      id: string;
      role: string;
      token: string;
      expires_at: string;
      accepted_at: string | null;
    }[] | null) ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-foreground">Equipo</h1>
      <p className="mt-1 text-muted-foreground">
        Miembros de {profile?.tenants?.name}.{" "}
        {isAdmin
          ? "Como admin, puedes cambiar roles y el permiso de publicación."
          : "Sólo un administrador puede cambiar roles."}
      </p>

      <div className="mt-6">
        <TeamTable members={members} isAdmin={!!isAdmin} currentUserId={user!.id} />
      </div>

      {isAdmin && (
        <div className="mt-6">
          <InviteManager invites={invites} siteUrl={SITE_URL} />
        </div>
      )}
    </div>
  );
}
