import { createClient } from "@/lib/supabase/server";
import { isSysadmin } from "@/lib/insight-catalog";
import { listUserOrganizations, memberRoleIds, type ManagedUser } from "@/lib/insight-users";
import { UsersManager } from "@/components/insight/users-manager";
import { getViewedUser } from "@/lib/view-as";

type Role = { id: string; code: string; name: string };
type MemberRpc = Omit<ManagedUser, "role_ids">;

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const organizations = await listUserOrganizations(user.id);
  if (!organizations.length) return <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6"><h1 className="text-2xl font-semibold text-foreground">Usuarios</h1><p className="mt-2 text-sm text-muted-foreground">No tienes permiso para administrar usuarios en una organización.</p></div>;

  const viewedUser = await getViewedUser(user.id);
  const current = organizations.find((item) => item.id === org) ?? organizations.find((item) => item.id === viewedUser?.organizationId) ?? organizations[0];
  const [rolesResult, membersResult, roleIds, admin] = await Promise.all([
    supabase.rpc("list_org_roles", { p_org: current.id }),
    supabase.rpc("list_org_members", { p_org: current.id }),
    memberRoleIds(current.id),
    isSysadmin(user.id),
  ]);
  if (rolesResult.error || membersResult.error) throw new Error("No se pudieron cargar los usuarios de esta organización.");
  const roleMap = new Map(roleIds.map((item) => [item.user_id, item.role_ids]));
  const members = ((membersResult.data as MemberRpc[] | null) ?? []).map((member) => ({ ...member, role_ids: roleMap.get(member.user_id) ?? [] }));
  return <UsersManager
    key={current.id}
    organization={current}
    organizations={organizations}
    roles={(rolesResult.data as Role[] | null) ?? []}
    initialMembers={members}
    currentUserId={user.id}
    canCreate={current.can_create}
    canEdit={current.can_edit}
    canRemove={current.can_remove}
    canResetPassword={admin && current.can_edit}
    canViewAs={admin}
  />;
}
