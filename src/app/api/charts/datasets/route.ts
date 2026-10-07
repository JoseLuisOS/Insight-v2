import { NextResponse } from "next/server";
import Papa from "papaparse";
import { insightDb } from "@/lib/insight-db";
import { chartActor, chartOrganizations } from "@/lib/chart-v2-datasets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await chartActor();
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const organizationId = String(form.get("organizationId") ?? "");
  const file = form.get("file");
  if (name.length < 1 || name.length > 160 ||
      !(await chartOrganizations()).some((organization) => organization.id === organizationId)) {
    return NextResponse.json({ error: "Nombre u organización no válidos." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size < 1 || file.size > 4_000_000 ||
      !/\.(csv|tsv|txt)$/i.test(file.name)) {
    return NextResponse.json({ error: "Elige un archivo CSV, TSV o TXT de hasta 4 MB." }, { status: 400 });
  }
  const parsed = Papa.parse<string[]>(await file.text(), { skipEmptyLines: true });
  if (parsed.errors.length || parsed.data.length < 2) {
    return NextResponse.json({ error: "No se pudo interpretar el archivo o no contiene registros." }, { status: 400 });
  }
  const columns = parsed.data[0].map((column) => column.trim());
  if (columns.length < 1 || columns.length > 200 || columns.some((column) => !column || column.length > 120) ||
      new Set(columns).size !== columns.length || parsed.data.length > 50001) {
    return NextResponse.json({ error: "El archivo requiere hasta 200 columnas con nombres únicos y hasta 50,000 registros." }, { status: 400 });
  }
  const records = parsed.data.slice(1).map((values, index) => ({
    n: index + 1,
    v: Object.fromEntries(columns.map((column, columnIndex) => [column, values[columnIndex] ?? null])),
  }));
  const client = await insightDb().connect();
  try {
    await client.query("begin");
    const created = await client.query(`insert into insight_core.core_datasets
      (organization_id, name, columns_json, row_count, created_by)
      values ($1, $2, $3::jsonb, $4, $5) returning id`,
      [organizationId, name, JSON.stringify(columns), records.length, actor.userId]);
    const datasetId = created.rows[0].id as string;
    for (let index = 0; index < records.length; index += 500) {
      await client.query(`insert into insight_core.core_dataset_rows
        (organization_id, dataset_id, row_number, values_json)
        select $1, $2, (item->>'n')::integer, item->'v'
        from jsonb_array_elements($3::jsonb) item`,
        [organizationId, datasetId, JSON.stringify(records.slice(index, index + 500))]);
    }
    await client.query("commit");
    return NextResponse.json({ datasetId });
  } catch {
    await client.query("rollback");
    return NextResponse.json({ error: "No se pudo guardar el dataset." }, { status: 500 });
  } finally {
    client.release();
  }
}
