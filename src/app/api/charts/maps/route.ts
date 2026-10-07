import { NextResponse } from "next/server";
import { insightDb } from "@/lib/insight-db";
import { chartActor, chartOrganizations } from "@/lib/chart-v2-datasets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await chartActor();
  const form = await request.formData();
  const organizationId = String(form.get("organizationId") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const nameProperty = String(form.get("nameProperty") ?? "name").trim();
  const file = form.get("file");
  if (!(await chartOrganizations()).some((organization) => organization.id === organizationId) ||
      !name || name.length > 160 || !nameProperty || nameProperty.length > 120 ||
      !(file instanceof File) || !file.name.toLowerCase().endsWith(".geojson") || file.size < 1 || file.size > 4_000_000) {
    return NextResponse.json({ error: "Mapa, organización o archivo no válidos." }, { status: 400 });
  }
  let geo: { type?: string; features?: { type?: string; geometry?: { type?: string; coordinates?: unknown }; properties?: Record<string, unknown> }[] };
  try { geo = JSON.parse(await file.text()); } catch { return NextResponse.json({ error: "El archivo no contiene JSON válido." }, { status: 400 }); }
  if (geo.type !== "FeatureCollection" || !Array.isArray(geo.features) ||
      !geo.features.length || geo.features.length > 10000 ||
      !geo.features.some((feature) => feature.properties?.[nameProperty] != null) ||
      geo.features.some((feature) => feature.type !== "Feature" || !feature.geometry?.type || feature.geometry.coordinates === undefined)) {
    return NextResponse.json({ error: "Se requiere un FeatureCollection con la propiedad de región indicada." }, { status: 400 });
  }
  const saved = await insightDb().query(`insert into insight_core.core_chart_maps
    (organization_id, name, name_property, geojson, created_by)
    values ($1, $2, $3, $4::jsonb, $5) returning id`,
    [organizationId, name, nameProperty, JSON.stringify(geo), actor.userId]);
  return NextResponse.json({ mapId: saved.rows[0].id });
}
