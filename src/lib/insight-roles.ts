import "server-only";
import { insightDb } from "@/lib/insight-db";
import { catalogCodeFromName } from "@/lib/catalog-code";

export type RoleOrganization = { id: string; name: string };
export type RolePermission = { id: string; code: string; action: string; description: string | null; module_code: string; module_name: string; group_code: string; group_name: string; group_icon: string | null };
export type InsightRole = { id: string; organization_id: string; code: string; name: string; description: string | null; is_system: boolean; is_editable: boolean; member_count: number; permission_ids: string[] };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listRoleWorkspace() {
  const [organizations, permissions, roles] = await Promise.all([
    insightDb().query("select id, name from insight_core.core_organizations where status = 'active' order by name"),
    insightDb().query(`select p.id, p.code, p.action, p.description, m.code as module_code, m.name as module_name,
      g.code as group_code, g.name as group_name, g.icon as group_icon
      from insight_iam.iam_permissions p
      join insight_iam.iam_modules im on im.id = p.module_id
      join insight_core.app_modules m on m.code = im.code
      join insight_core.app_groups g on g.code = m.group_code
      where p.action in ('operar','crear','editar','eliminar','exportar')
      order by g.sort_order, m.sort_order, m.name, case p.action when 'operar' then 0 else 1 end, p.action`),
    insightDb().query(`select r.id, r.organization_id, r.code, r.name, r.description, r.is_system, r.is_editable,
      (select count(*)::int from insight_iam.iam_membership_roles mr where mr.role_id = r.id) as member_count,
      coalesce((select array_agg(p.id::text order by p.code) from insight_iam.iam_role_permissions rp
        join insight_iam.iam_permissions p on p.id = rp.permission_id
        join insight_iam.iam_modules im on im.id = p.module_id
        join insight_core.app_modules m on m.code = im.code
        where rp.role_id = r.id and p.action in ('operar','crear','editar','eliminar','exportar')), '{}') as permission_ids
      from insight_iam.iam_roles r order by r.name`),
  ]);
  return { organizations: organizations.rows as RoleOrganization[], permissions: permissions.rows as RolePermission[], roles: roles.rows as InsightRole[] };
}

function validateRoleInput(input: unknown, create: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Datos inválidos.");
  const value = input as Record<string, unknown>;
  const allowed = create ? ["organizationId", "name", "description", "permissionIds"] : ["id", "name", "description", "permissionIds"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error("Campo no reconocido.");
  if (create && (typeof value.organizationId !== "string" || !uuid.test(value.organizationId))) throw new Error("Organización inválida.");
  if (!create && (typeof value.id !== "string" || !uuid.test(value.id))) throw new Error("Rol inválido.");
  if (typeof value.name !== "string" || value.name.trim().length < 2 || value.name.trim().length > 60) throw new Error("Nombre inválido (2 a 60 caracteres).");
  if (typeof value.description !== "string" || value.description.trim().length > 240) throw new Error("Descripción inválida (máximo 240 caracteres).");
  if (!Array.isArray(value.permissionIds) || value.permissionIds.some((id) => typeof id !== "string" || !uuid.test(id))) throw new Error("Permisos inválidos.");
  const permissionIds = [...new Set(value.permissionIds as string[])];
  const code = catalogCodeFromName(value.name.trim());
  if (code === "sysadmin") throw new Error("El rol sysadmin es interno y no se administra por organización.");
  if (create && !/^[a-z0-9_]{2,40}$/.test(code)) throw new Error("No se pudo generar un código válido.");
  return { id: value.id as string | undefined, organizationId: value.organizationId as string | undefined, name: value.name.trim(), description: value.description.trim() || null, code, permissionIds };
}

async function validatePermissions(client: Awaited<ReturnType<ReturnType<typeof insightDb>["connect"]>> , ids: string[]) {
  const { rows } = await client.query(`select p.id::text, p.action, m.code as module_code from insight_iam.iam_permissions p
    join insight_iam.iam_modules im on im.id = p.module_id
    join insight_core.app_modules m on m.code = im.code
    where p.id = any($1::uuid[]) and p.action in ('operar','crear','editar','eliminar','exportar')`, [ids]);
  if (rows.length !== ids.length) throw new Error("Uno o varios permisos no existen en el catálogo.");
  const byModule = new Map<string, { id: string; action: string; module_code: string }[]>();
  for (const row of rows as { id: string; action: string; module_code: string }[]) byModule.set(row.module_code, [...(byModule.get(row.module_code) ?? []), row]);
  for (const moduleRows of byModule.values()) {
    if (moduleRows.some((row) => row.action !== "operar") && !moduleRows.some((row) => row.action === "operar")) {
      throw new Error("Selecciona Operar para cada módulo con acciones adicionales.");
    }
  }
}

export async function saveInsightRole(input: unknown, create: boolean) {
  const role = validateRoleInput(input, create);
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    await validatePermissions(client, role.permissionIds);
    let id = role.id;
    if (create) {
      const org = await client.query("select 1 from insight_core.core_organizations where id = $1 and status = 'active'", [role.organizationId]);
      if (!org.rows.length) throw new Error("La organización no está disponible.");
      const result = await client.query(`insert into insight_iam.iam_roles (organization_id, code, name, description)
        values ($1,$2,$3,$4) returning id`, [role.organizationId, role.code, role.name, role.description]);
      id = result.rows[0].id;
    } else {
      const existing = await client.query("select code from insight_iam.iam_roles where id = $1", [id]);
      if (existing.rows[0]?.code === "sysadmin") throw new Error("El rol sysadmin es interno y no se administra por organización.");
      const result = await client.query(`update insight_iam.iam_roles set name = $2, description = $3, updated_at = now()
        where id = $1 returning id`, [id, role.name, role.description]);
      if (!result.rows.length) throw new Error("El rol no existe.");
      // Keep legacy IAM permissions outside the managed module catalog intact.
      await client.query(`delete from insight_iam.iam_role_permissions rp using insight_iam.iam_permissions p,
        insight_iam.iam_modules im, insight_core.app_modules m
        where rp.permission_id = p.id and p.module_id = im.id and m.code = im.code
        and p.action in ('operar','crear','editar','eliminar','exportar') and rp.role_id = $1`, [id]);
    }
    if (role.permissionIds.length) await client.query(`insert into insight_iam.iam_role_permissions (role_id, permission_id)
      select $1, unnest($2::uuid[]) on conflict do nothing`, [id, role.permissionIds]);
    await client.query("commit");
    return { id, code: role.code };
  } catch (error) {
    await client.query("rollback");
    if (error && typeof error === "object" && "code" in error && error.code === "23505") throw new Error("Ya existe un rol con ese código en la organización.");
    throw error;
  } finally { client.release(); }
}

export async function deleteInsightRole(id: string) {
  if (!uuid.test(id)) throw new Error("Rol inválido.");
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    const role = await client.query("select id, code from insight_iam.iam_roles where id = $1 for update", [id]);
    if (!role.rows.length) throw new Error("El rol no existe.");
    if (role.rows[0].code === "sysadmin") throw new Error("El rol sysadmin es interno y no se administra por organización.");
    if (role.rows[0].code === "owner") throw new Error("El rol owner es obligatorio y no se puede eliminar.");
    const members = await client.query("select 1 from insight_iam.iam_membership_roles where role_id = $1 limit 1", [id]);
    if (members.rows.length) throw new Error("Quita este rol de sus miembros antes de eliminarlo.");
    const resources = await client.query("select 1 from insight_iam.iam_resource_permissions where role_id = $1 limit 1", [id]);
    if (resources.rows.length) throw new Error("Quita las concesiones de recursos de este rol antes de eliminarlo.");
    await client.query("delete from insight_iam.iam_roles where id = $1", [id]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
