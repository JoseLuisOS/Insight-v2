import "server-only";
import { insightDb } from "@/lib/insight-db";

export const ADDABLE_ACTIONS = ["crear", "editar", "eliminar", "exportar"] as const;
export type AddableAction = typeof ADDABLE_ACTIONS[number];
export type ManagedPermission = {
  code: string;
  module_code: string;
  action: string;
  description: string | null;
};

const defaultDescriptions: Record<AddableAction, string> = {
  crear: "Permite crear registros en el módulo.",
  editar: "Permite editar registros en el módulo.",
  eliminar: "Permite eliminar registros en el módulo.",
  exportar: "Permite exportar datos del módulo.",
};

export async function listManagedPermissions(): Promise<ManagedPermission[]> {
  const { rows } = await insightDb().query(`
    select p.code, m.code as module_code, p.action, p.description
    from insight_core.app_modules m
    join insight_iam.iam_modules im on im.code = m.code
    join insight_iam.iam_permissions p on p.module_id = im.id
    where p.action in ('operar','crear','editar','eliminar','exportar')
    order by m.group_code, m.sort_order, m.name,
      case p.action when 'operar' then 0 when 'crear' then 1
        when 'editar' then 2 when 'eliminar' then 3 else 4 end
  `);
  return rows;
}

export async function createManagedPermissions(moduleCode: string, actions: string[]) {
  if (!/^[a-z0-9_]{2,40}$/.test(moduleCode) || !Array.isArray(actions) || !actions.length
      || new Set(actions).size !== actions.length
      || actions.some((action) => !ADDABLE_ACTIONS.includes(action as AddableAction))) {
    throw new Error("Módulo o acciones inválidos.");
  }
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    const module = await client.query(`
      select im.id from insight_core.app_modules m
      join insight_iam.iam_modules im on im.code = m.code
      where m.code = $1 for update of m
    `, [moduleCode]);
    if (!module.rows.length) throw new Error("El módulo no existe o no está sincronizado con IAM.");
    const { rows } = await client.query(`
      insert into insight_iam.iam_permissions(module_id, code, action, description)
      select $1, $2 || '.' || requested.action, requested.action,
        case requested.action
          when 'crear' then $3
          when 'editar' then $4
          when 'eliminar' then $5
          else $6 end
      from unnest($7::text[]) as requested(action)
      on conflict (code) do nothing
      returning code
    `, [module.rows[0].id, moduleCode, defaultDescriptions.crear, defaultDescriptions.editar,
      defaultDescriptions.eliminar, defaultDescriptions.exportar, actions]);
    if (rows.length !== actions.length) throw new Error("Uno o varios permisos ya están asignados a este módulo.");
    await client.query("commit");
    return rows;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}

export async function updateManagedPermission(code: string, description: string) {
  if (!/^[a-z0-9_]{2,40}\.(operar|crear|editar|eliminar|exportar)$/.test(code)
      || description.trim().length > 240) throw new Error("Permiso o descripción inválidos.");
  const { rows } = await insightDb().query(`
    update insight_iam.iam_permissions p set description = $2
    from insight_iam.iam_modules im
    join insight_core.app_modules m on m.code = im.code
    where p.module_id = im.id and p.code = $1
    returning p.code
  `, [code, description.trim() || null]);
  if (!rows.length) throw new Error("El permiso no existe.");
  return rows[0];
}

export async function deleteManagedPermission(code: string) {
  if (!/^[a-z0-9_]{2,40}\.(crear|editar|eliminar|exportar)$/.test(code)) {
    throw new Error("El permiso operar es obligatorio y no puede eliminarse.");
  }
  const { rows } = await insightDb().query(`
    delete from insight_iam.iam_permissions p
    using insight_iam.iam_modules im, insight_core.app_modules m
    where p.module_id = im.id and m.code = im.code and p.code = $1
    returning p.code
  `, [code]);
  if (!rows.length) throw new Error("El permiso no existe.");
  return rows[0];
}
