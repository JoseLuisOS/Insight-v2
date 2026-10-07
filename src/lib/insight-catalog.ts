import "server-only";
import { insightDb, insightQuery } from "@/lib/insight-db";
import { redirect } from "next/navigation";
import { catalogCodeFromName } from "@/lib/catalog-code";
import { cache } from "react";
import { getSessionUser } from "@/lib/session-user";

export type State = "apagado" | "desarrollo" | "disponible";
export type CatalogGroup = { code: string; name: string; description: string | null; icon: string | null; sort_order: number; active: boolean; visible: boolean; state: State };
export type CatalogModule = CatalogGroup & { group_code: string };

export const isSysadmin = cache(async (userId: string): Promise<boolean> => {
  const { rows } = await insightQuery("iam.sysadmin",
    "select 1 from insight_iam.iam_platform_admins where user_id = $1 and role = 'sysadmin' limit 1",
    [userId],
  );
  return rows.length > 0;
});

export async function currentSysadmin(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return (await isSysadmin(user.id)) ? user.id : null;
}

export const listCatalog = cache(async (): Promise<{ groups: CatalogGroup[]; modules: CatalogModule[] }> => {
  const [groups, modules] = await Promise.all([
    insightQuery("catalog.groups", "select code,name,description,icon,sort_order,active,visible,state from insight_core.app_groups order by sort_order,name"),
    insightQuery("catalog.modules", "select code,group_code,name,description,icon,sort_order,active,visible,state from insight_core.app_modules order by group_code,sort_order,name"),
  ]);
  return { groups: groups.rows, modules: modules.rows };
});

export const userCatalogAccess = cache(async (userId: string, admin: boolean): Promise<Set<string>> => {
  const { rows } = await insightQuery("catalog.access", `
    select m.code, m.state as module_state, g.state as group_state,
      exists (
        select 1
        from insight_iam.iam_organization_memberships mem
        join insight_iam.iam_permissions p on p.code = m.code || '.operar'
        left join insight_iam.iam_user_permission_overrides o
          on o.membership_id = mem.id and o.permission_id = p.id
        where mem.user_id = $1 and mem.status = 'active'
          and (o.effect = 'allow' or (o.effect is null and exists (
            select 1 from insight_iam.iam_membership_roles mr
            join insight_iam.iam_role_permissions rp
              on rp.role_id = mr.role_id and rp.permission_id = p.id
            where mr.membership_id = mem.id
          )))
      ) as can_operate
    from insight_core.app_modules m
    join insight_core.app_groups g on g.code = m.group_code
    where m.active and m.visible and g.active and g.visible`, [userId]);
  const access = new Set<string>();
  for (const row of rows) {
    if (admin) {
      if (row.group_state !== "apagado" && row.module_state !== "apagado") access.add(row.code);
    } else if (!["insight_roles", "insight_permissions"].includes(row.code) && row.can_operate && row.group_state === "disponible" && row.module_state === "disponible") {
      access.add(row.code);
    }
  }
  return access;
});

export async function requireCatalogAccess(code: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const access = await userCatalogAccess(user.id, await isSysadmin(user.id));
  if (!access.has(code)) redirect("/profile");
}

export type CatalogInput = {
  code?: string; group_code?: string; name?: string; description?: string | null;
  icon?: string | null; sort_order?: number; active?: boolean; visible?: boolean; state?: State;
};

export function validateInput(value: unknown, kind: "group" | "module", create: boolean): CatalogInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Datos inválidos.");
  const obj = value as Record<string, unknown>;
  const keys = ["code","group_code","name","description","icon","sort_order","active","visible","state"];
  if (Object.keys(obj).some((key) => !keys.includes(key))) throw new Error("Campo no reconocido.");
  const out: CatalogInput = {};
  if (!create && obj.code !== undefined) throw new Error("El ID no se puede cambiar.");
  if (kind === "module" && (create || obj.group_code !== undefined)) {
    if (typeof obj.group_code !== "string" || !/^[a-z0-9_]{2,40}$/.test(obj.group_code)) throw new Error("Grupo padre inválido.");
    out.group_code = obj.group_code;
  } else if (obj.group_code !== undefined) throw new Error("Campo no reconocido.");
  if (create || obj.name !== undefined) {
    if (typeof obj.name !== "string" || obj.name.trim().length < 2 || obj.name.trim().length > 60) throw new Error("Nombre inválido.");
    out.name = obj.name.trim();
  }
  if (create) {
    const code = catalogCodeFromName(out.name ?? "");
    if (!/^[a-z0-9_]{2,40}$/.test(code)) throw new Error("No se pudo generar un ID válido a partir del nombre.");
    if ((kind === "group" && code === "insight") || (kind === "module" && ["insight_catalog", "insight_organizations"].includes(code))) throw new Error("ID reservado para administración de la plataforma.");
    out.code = code;
  }
  for (const key of ["description", "icon"] as const) {
    if (obj[key] !== undefined) {
      if (obj[key] !== null && (typeof obj[key] !== "string" || obj[key].length > (key === "icon" ? 40 : 200))) throw new Error(`${key} inválido.`);
      out[key] = typeof obj[key] === "string" ? obj[key].trim() || null : null;
    }
  }
  if (obj.sort_order !== undefined) {
    if (!Number.isInteger(obj.sort_order) || (obj.sort_order as number) < 0 || (obj.sort_order as number) > 999) throw new Error("Orden inválido.");
    out.sort_order = obj.sort_order as number;
  }
  if (obj.state !== undefined) {
    if (!["apagado","desarrollo","disponible"].includes(String(obj.state))) throw new Error("Estado inválido.");
    out.state = obj.state as State;
  }
  for (const key of ["active", "visible"] as const) {
    if (obj[key] !== undefined) {
      if (typeof obj[key] !== "boolean") throw new Error(`${key} inválido.`);
      out[key] = obj[key] as boolean;
    }
  }
  if (out.visible === true) out.active = true;
  if (out.active === false) out.visible = false;
  if (!create && !Object.keys(out).length) throw new Error("Sin cambios.");
  return out;
}

export async function saveCatalog(kind: "group" | "module", input: CatalogInput, actorId: string, code?: string) {
  if ((kind === "group" && code === "insight") || (kind === "module" && ["insight_catalog", "insight_organizations"].includes(code ?? ""))) throw new Error("El panel de administración no se puede editar desde el catálogo.");
  const table = kind === "group" ? "insight_core.app_groups" : "insight_core.app_modules";
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    let before = null;
    if (code) {
      const found = await client.query(`select * from ${table} where code = $1 for update`, [code]);
      if (!found.rows.length) throw new Error("El componente no existe.");
      before = found.rows[0];
    }
    const data = code ? input : { state: "desarrollo", sort_order: 0, ...input, active: true, visible: true };
    const fields = Object.keys(data);
    const values = Object.values(data);
    const result = code
      ? await client.query(`update ${table} set ${fields.map((f, i) => `${f} = $${i+1}`).join(", ")}, updated_at = now() where code = $${fields.length+1} returning *`, [...values, code])
      : await client.query(`insert into ${table} (${fields.join(",")}) values (${fields.map((_, i) => `$${i+1}`).join(",")}) returning *`, values);
    const after = result.rows[0];
    await client.query("insert into insight_core.app_module_audit(actor_id,entity,entity_code,action,before_value,after_value) values ($1,$2,$3,$4,$5,$6)",
      [actorId,kind,after.code,code ? "update" : "create",before,after]);
    await client.query("commit");
    return after;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}
