import "server-only";
import { randomBytes } from "node:crypto";
import { insightDb } from "@/lib/insight-db";
import { isSysadmin } from "@/lib/insight-catalog";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ManagedUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  status: "invited" | "active" | "suspended" | "revoked";
  roles: string[];
  role_ids: string[];
};
export type UserOrganization = { id: string; name: string; can_create: boolean; can_edit: boolean; can_remove: boolean };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listUserOrganizations(userId: string): Promise<UserOrganization[]> {
  const { rows } = await insightDb().query(`with actor as (
      select exists(select 1 from insight_iam.iam_platform_admins where user_id = $1 and role = 'sysadmin') as admin
    ), access as (
      select o.id, o.name, permission.code,
        (select admin from actor) or exists (
          select 1 from insight_iam.iam_organization_memberships m
          join insight_iam.iam_permissions p on p.code = permission.code
          left join insight_iam.iam_user_permission_overrides ov
            on ov.membership_id = m.id and ov.permission_id = p.id
          where m.organization_id = o.id and m.user_id = $1 and m.status = 'active'
            and (ov.effect = 'allow' or (ov.effect is null and exists (
              select 1 from insight_iam.iam_membership_roles mr
              join insight_iam.iam_role_permissions rp on rp.role_id = mr.role_id and rp.permission_id = p.id
              where mr.membership_id = m.id
            )))
        ) as allowed
      from insight_core.core_organizations o
      cross join (values ('members.view'), ('members.invite'), ('members.update'), ('members.remove')) as permission(code)
      where o.status = 'active'
    )
    select id, name,
      bool_or(code = 'members.invite' and allowed) as can_create,
      bool_or(code = 'members.update' and allowed) as can_edit,
      bool_or(code = 'members.remove' and allowed) as can_remove
    from access group by id, name
    having bool_or(code in ('members.view','members.invite') and allowed)
    order by name`, [userId]);
  return rows;
}

export async function memberRoleIds(orgId: string): Promise<{ user_id: string; role_ids: string[] }[]> {
  const { rows } = await insightDb().query(`select m.user_id,
    coalesce(array_agg(mr.role_id::text) filter (where mr.role_id is not null), '{}') as role_ids
    from insight_iam.iam_organization_memberships m
    left join insight_iam.iam_membership_roles mr on mr.membership_id = m.id
    where m.organization_id = $1
      and not exists (select 1 from insight_iam.iam_platform_admins a where a.user_id = m.user_id)
    group by m.user_id`, [orgId]);
  return rows;
}

async function authorize(orgId: string, permission: string) {
  if (!uuid.test(orgId)) throw new Error("Organización inválida.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sesión para continuar.");
  const { data, error } = await supabase.rpc("iam_has_permission", { p_org: orgId, p_code: permission });
  if (error || !data) throw new Error("No tienes permiso para esta operación.");
  return user.id;
}

export async function updateMember(input: { orgId: string; userId: string; displayName: string; roleIds: string[] }) {
  if (!uuid.test(input.userId) || typeof input.displayName !== "string" || input.displayName.trim().length < 2 || input.displayName.trim().length > 100 || !Array.isArray(input.roleIds) || !input.roleIds.length || input.roleIds.some((id) => typeof id !== "string" || !uuid.test(id))) throw new Error("Datos del usuario inválidos.");
  const actor = await authorize(input.orgId, "members.update");
  if (actor === input.userId) throw new Error("No puedes cambiar tus propios roles desde Usuarios.");
  const ids = [...new Set(input.roleIds)];
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    await client.query("select 1 from insight_core.core_organizations where id = $1 for update", [input.orgId]);
    const membership = await client.query("select id, status from insight_iam.iam_organization_memberships where organization_id = $1 and user_id = $2 for update", [input.orgId, input.userId]);
    if (!membership.rows.length) throw new Error("El usuario ya no pertenece a esta organización.");
    const actorAdmin = await ensureManageableMember(client, input.orgId, membership.rows[0].id, input.userId, actor);
    const roles = await client.query("select id, code from insight_iam.iam_roles where organization_id = $1 and id = any($2::uuid[])", [input.orgId, ids]);
    if (roles.rows.length !== ids.length) throw new Error("Alguno de los roles no pertenece a esta organización.");
    const owner = await client.query("select id from insight_iam.iam_roles where organization_id = $1 and code = 'owner'", [input.orgId]);
    const ownerId = owner.rows[0]?.id as string | undefined;
    const currentOwner = ownerId && await client.query("select 1 from insight_iam.iam_membership_roles where membership_id = $1 and role_id = $2", [membership.rows[0].id, ownerId]);
    const nextOwner = roles.rows.some((role: { code: string }) => role.code === "owner");
    if (nextOwner && !actorAdmin) {
      const actorOwner = await client.query(`select 1 from insight_iam.iam_organization_memberships m
        join insight_iam.iam_membership_roles mr on mr.membership_id = m.id
        where m.organization_id = $1 and m.user_id = $2 and m.status = 'active' and mr.role_id = $3`, [input.orgId, actor, ownerId]);
      if (!actorOwner.rows.length) throw new Error("Solo un Owner puede asignar el rol Owner.");
    }
    if (currentOwner && currentOwner.rows.length && !nextOwner) {
      const others = await client.query(`select 1 from insight_iam.iam_organization_memberships m
        join insight_iam.iam_membership_roles mr on mr.membership_id = m.id
        where m.organization_id = $1 and m.id <> $2 and m.status = 'active' and mr.role_id = $3 limit 1`, [input.orgId, membership.rows[0].id, ownerId]);
      if (!others.rows.length) throw new Error("La organización debe conservar un Owner activo.");
    }
    await client.query(`insert into insight_core.core_user_profiles (user_id, display_name)
      values ($1, $2) on conflict (user_id) do update set display_name = excluded.display_name, updated_at = now()`, [input.userId, input.displayName.trim()]);
    await client.query("delete from insight_iam.iam_membership_roles where membership_id = $1", [membership.rows[0].id]);
    await client.query("insert into insight_iam.iam_membership_roles (membership_id, role_id) select $1, unnest($2::uuid[])", [membership.rows[0].id, ids]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function setMemberStatus(orgId: string, userId: string, active: boolean) {
  if (!uuid.test(userId) || typeof active !== "boolean") throw new Error("Usuario o estado inválido.");
  const actor = await authorize(orgId, "members.update");
  if (actor === userId) throw new Error("No puedes cambiar tu propio estado.");
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    await client.query("select 1 from insight_core.core_organizations where id = $1 for update", [orgId]);
    const membership = await client.query("select id, status from insight_iam.iam_organization_memberships where organization_id = $1 and user_id = $2 for update", [orgId, userId]);
    if (!membership.rows.length || !["active", "suspended"].includes(membership.rows[0].status)) throw new Error("Este estado no se puede cambiar desde Usuarios.");
    await ensureManageableMember(client, orgId, membership.rows[0].id, userId, actor);
    if (!active && membership.rows[0].status === "active") await ensureAnotherOwner(client, orgId, membership.rows[0].id);
    await client.query("update insight_iam.iam_organization_memberships set status = $2, updated_at = now() where id = $1", [membership.rows[0].id, active ? "active" : "suspended"]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

type PgClient = Awaited<ReturnType<ReturnType<typeof insightDb>["connect"]>>;
async function ensureManageableMember(client: PgClient, orgId: string, membershipId: string, targetUserId: string, actorId: string) {
  const admins = await client.query("select user_id from insight_iam.iam_platform_admins where user_id in ($1, $2) and role = 'sysadmin'", [actorId, targetUserId]);
  const actorAdmin = admins.rows.some((row: { user_id: string }) => row.user_id === actorId);
  if (admins.rows.some((row: { user_id: string }) => row.user_id === targetUserId)) throw new Error("La cuenta maestra no se administra desde Usuarios.");
  const owner = await client.query("select id from insight_iam.iam_roles where organization_id = $1 and code = 'owner'", [orgId]);
  if (!owner.rows.length || actorAdmin) return actorAdmin;
  const targetOwner = await client.query("select 1 from insight_iam.iam_membership_roles where membership_id = $1 and role_id = $2", [membershipId, owner.rows[0].id]);
  if (!targetOwner.rows.length) return actorAdmin;
  const actorOwner = await client.query(`select 1 from insight_iam.iam_organization_memberships m
    join insight_iam.iam_membership_roles mr on mr.membership_id = m.id
    where m.organization_id = $1 and m.user_id = $2 and m.status = 'active' and mr.role_id = $3`, [orgId, actorId, owner.rows[0].id]);
  if (!actorOwner.rows.length) throw new Error("Solo un Owner puede modificar a otro Owner.");
  return actorAdmin;
}

async function ensureAnotherOwner(client: PgClient, orgId: string, membershipId: string) {
  const owner = await client.query("select id from insight_iam.iam_roles where organization_id = $1 and code = 'owner'", [orgId]);
  if (!owner.rows.length) return;
  const current = await client.query("select 1 from insight_iam.iam_membership_roles where membership_id = $1 and role_id = $2", [membershipId, owner.rows[0].id]);
  if (!current.rows.length) return;
  const others = await client.query(`select 1 from insight_iam.iam_organization_memberships m
    join insight_iam.iam_membership_roles mr on mr.membership_id = m.id
    where m.organization_id = $1 and m.id <> $2 and m.status = 'active' and mr.role_id = $3 limit 1`, [orgId, membershipId, owner.rows[0].id]);
  if (!others.rows.length) throw new Error("La organización debe conservar un Owner activo.");
}

export async function removeMember(orgId: string, userId: string) {
  if (!uuid.test(userId)) throw new Error("Usuario inválido.");
  const actor = await authorize(orgId, "members.remove");
  if (actor === userId) throw new Error("No puedes quitar tu propia membresía.");
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    await client.query("select 1 from insight_core.core_organizations where id = $1 for update", [orgId]);
    const membership = await client.query("select id from insight_iam.iam_organization_memberships where organization_id = $1 and user_id = $2 for update", [orgId, userId]);
    if (!membership.rows.length) throw new Error("El usuario ya no pertenece a esta organización.");
    await ensureManageableMember(client, orgId, membership.rows[0].id, userId, actor);
    await ensureAnotherOwner(client, orgId, membership.rows[0].id);
    await client.query("delete from insight_iam.iam_organization_memberships where id = $1", [membership.rows[0].id]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function resetMemberPassword(orgId: string, userId: string) {
  if (!uuid.test(userId)) throw new Error("Usuario inválido.");
  const actor = await authorize(orgId, "members.update");
  if (!await isSysadmin(actor)) throw new Error("Solo sysadmin puede restablecer una contraseña global.");
  if (actor === userId) throw new Error("Cambia tu contraseña desde Perfil.");
  if (await isSysadmin(userId)) throw new Error("La cuenta maestra no se administra desde Usuarios.");
  const { rows } = await insightDb().query("select 1 from insight_iam.iam_organization_memberships where organization_id = $1 and user_id = $2", [orgId, userId]);
  if (!rows.length) throw new Error("El usuario ya no pertenece a esta organización.");
  const admin = createAdminClient();
  const { data: account, error: readError } = await admin.auth.admin.getUserById(userId);
  if (readError || !account.user) throw new Error("No se pudo consultar la cuenta.");
  const password = randomBytes(18).toString("base64url");
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    app_metadata: { ...account.user.app_metadata, must_change_password: true },
  });
  if (error) throw new Error("No se pudo restablecer la contraseña.");
  return password;
}
