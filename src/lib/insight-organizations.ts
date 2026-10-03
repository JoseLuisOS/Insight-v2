import "server-only";
import { insightDb } from "@/lib/insight-db";
import { catalogCodeFromName } from "@/lib/catalog-code";
import { threeLetterCode } from "@/lib/survey-codes";

export type InsightOrganization = {
  id: string;
  name: string;
  slug: string;
  code_prefix: string;
  timezone: string;
  status: "active" | "inactive" | "suspended" | "archived";
  member_count: number;
  role_count: number;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses = ["active", "inactive", "suspended", "archived"] as const;

export async function listOrganizations(): Promise<InsightOrganization[]> {
  const { rows } = await insightDb().query(`select o.id, o.name, o.slug, o.code_prefix, o.timezone, o.status,
    (select count(*)::int from insight_iam.iam_organization_memberships m
      where m.organization_id = o.id and m.status = 'active') as member_count,
    (select count(*)::int from insight_iam.iam_roles r where r.organization_id = o.id) as role_count
    from insight_core.core_organizations o order by o.created_at desc, o.name`);
  return rows as InsightOrganization[];
}

function validate(input: unknown, edit: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Datos inválidos.");
  const data = input as Record<string, unknown>;
  const allowed = edit ? ["id", "name", "timezone", "status"] : ["name", "timezone", "code_prefix"];
  if (Object.keys(data).some((key) => !allowed.includes(key))) throw new Error("Campo no reconocido.");
  if (edit && (typeof data.id !== "string" || !uuid.test(data.id))) throw new Error("Organización inválida.");
  if (typeof data.name !== "string" || data.name.trim().length < 2 || data.name.trim().length > 100) throw new Error("El nombre debe tener entre 2 y 100 caracteres.");
  if (typeof data.timezone !== "string" || data.timezone.length > 80) throw new Error("Zona horaria inválida.");
  try { new Intl.DateTimeFormat("es", { timeZone: data.timezone }); }
  catch { throw new Error("Zona horaria inválida."); }
  if (edit && !statuses.includes(data.status as typeof statuses[number])) throw new Error("Estado inválido.");
  const name = data.name.trim();
  const slug = catalogCodeFromName(name).replace(/_/g, "-");
  const codePrefix = edit ? undefined : String(data.code_prefix ?? threeLetterCode(name)).trim().toUpperCase();
  if (!edit && !/^[A-Z0-9]{3}$/.test(codePrefix ?? "")) throw new Error("El prefijo debe tener exactamente tres letras o números.");
  if (!edit && slug.length < 2) throw new Error("No se pudo generar un ID válido para la organización.");
  return { id: data.id as string | undefined, name, timezone: data.timezone, status: data.status as InsightOrganization["status"] | undefined, slug, codePrefix };
}

export async function saveOrganization(input: unknown, edit: boolean): Promise<InsightOrganization> {
  const data = validate(input, edit);
  const client = await insightDb().connect();
  let id = data.id;
  try {
    await client.query("begin");
    const duplicate = await client.query(`select 1 from insight_core.core_organizations
      where lower(trim(name)) = lower($1) and ($2::uuid is null or id <> $2::uuid) limit 1`, [data.name, data.id ?? null]);
    if (duplicate.rows.length) throw new Error("Ya existe una organización con ese nombre.");

    if (edit) {
      const changed = await client.query(`update insight_core.core_organizations
        set name = $2, timezone = $3, status = $4, updated_at = now()
        where id = $1 returning id`, [id, data.name, data.timezone, data.status]);
      if (!changed.rows.length) throw new Error("La organización ya no existe.");
    } else {
      const created = await client.query(`insert into insight_core.core_organizations (name, slug, code_prefix, timezone)
        values ($1, $2, $3, $4) returning id`, [data.name, data.slug, data.codePrefix, data.timezone]);
      id = created.rows[0].id;
      await client.query(`insert into insight_iam.iam_roles (organization_id, code, name, is_system, is_editable)
        select $1, item.code, item.name, true, false from (values
          ('owner', 'Owner'), ('administrator', 'Administrator'), ('analyst', 'Analyst'),
          ('operator', 'Operator'), ('viewer', 'Viewer')) as item(code, name)`, [id]);
      await client.query(`insert into insight_iam.iam_role_permissions (role_id, permission_id)
        select r.id, p.id from insight_iam.iam_roles r
        cross join insight_iam.iam_permissions p
        where r.organization_id = $1 and (r.code = 'owner' or p.action = 'operar')
        on conflict do nothing`, [id]);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    if (error && typeof error === "object" && "code" in error && error.code === "23505") throw new Error("Ya existe una organización con ese ID o prefijo.");
    throw error;
  } finally { client.release(); }
  const rows = await listOrganizations();
  const saved = rows.find((item) => item.id === id);
  if (!saved) throw new Error("No se pudo consultar la organización guardada.");
  return saved;
}
