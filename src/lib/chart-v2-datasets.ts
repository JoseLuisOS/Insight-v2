import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { insightDb } from "@/lib/insight-db";
import { isSysadmin, requireCatalogAccess } from "@/lib/insight-catalog";
import type { Row } from "@/lib/charts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type ChartOrganization = { id: string; name: string };
export type CoreDataset = { id: string; organization_id: string; name: string; columns: string[]; rows: Row[]; row_count: number };

export async function chartActor() {
  await requireCatalogAccess("graficas");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  return { supabase, userId: user.id, admin: await isSysadmin(user.id) };
}

export async function chartOrganizations(): Promise<ChartOrganization[]> {
  const actor = await chartActor();
  const query = await insightDb().query(`select o.id, o.name from insight_core.core_organizations o
    where o.status = 'active' and ($2::boolean or exists (
      select 1 from insight_iam.iam_organization_memberships m
      where m.organization_id = o.id and m.user_id = $1 and m.status = 'active'))
    order by o.name`, [actor.userId, actor.admin]);
  if (actor.admin) return query.rows as ChartOrganization[];
  const allowed = await Promise.all((query.rows as ChartOrganization[]).map(async (organization) => {
    const permission = await actor.supabase.rpc("iam_has_permission", { p_org: organization.id, p_code: "graficas.operar" });
    return !permission.error && permission.data === true;
  }));
  return (query.rows as ChartOrganization[]).filter((_, index) => allowed[index]);
}

export async function getCoreDataset(datasetId: string, limit = 5000): Promise<CoreDataset> {
  if (!UUID.test(datasetId)) notFound();
  const actor = await chartActor();
  const rows = await insightDb().query(`select id, organization_id, name, columns_json, row_count
    from insight_core.core_datasets where id = $1 and created_by = $2`, [datasetId, actor.userId]);
  const dataset = rows.rows[0] as { id: string; organization_id: string; name: string; columns_json: string[]; row_count: number } | undefined;
  if (!dataset || !(await chartOrganizations()).some((organization) => organization.id === dataset.organization_id)) notFound();
  const data = await insightDb().query(`select values_json from insight_core.core_dataset_rows
    where dataset_id = $1 and organization_id = $2 order by row_number limit $3`, [dataset.id, dataset.organization_id, limit]);
  return { id: dataset.id, organization_id: dataset.organization_id, name: dataset.name,
    columns: dataset.columns_json, rows: (data.rows as { values_json: Row }[]).map((row) => row.values_json), row_count: dataset.row_count };
}

export async function listCoreDatasets() {
  const actor = await chartActor();
  const organizations = await chartOrganizations();
  if (!organizations.length) return [];
  const result = await insightDb().query(`select d.id, d.name, d.row_count, d.organization_id, o.name as organization_name
    from insight_core.core_datasets d join insight_core.core_organizations o on o.id = d.organization_id
    where d.created_by = $1 and d.organization_id = any($2::uuid[])
    order by d.created_at desc`, [actor.userId, organizations.map((organization) => organization.id)]);
  return result.rows as { id: string; name: string; row_count: number; organization_id: string; organization_name: string }[];
}

export async function listCoreChartMaps(organizationId: string) {
  const actor = await chartActor();
  if (!(await chartOrganizations()).some((organization) => organization.id === organizationId)) notFound();
  const result = await insightDb().query(`select id, name, name_property, geojson
    from insight_core.core_chart_maps where organization_id = $1 and created_by = $2
    order by created_at desc`, [organizationId, actor.userId]);
  return result.rows as { id: string; name: string; name_property: string; geojson: object }[];
}

export async function getCoreChartMap(mapId: string, organizationId: string) {
  if (!UUID.test(mapId)) return null;
  const actor = await chartActor();
  const result = await insightDb().query(`select id, name, name_property, geojson
    from insight_core.core_chart_maps where id = $1 and organization_id = $2 and created_by = $3`,
    [mapId, organizationId, actor.userId]);
  return (result.rows[0] as { id: string; name: string; name_property: string; geojson: object } | undefined) ?? null;
}
