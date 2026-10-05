import { NextResponse } from "next/server";
import { getSurveyTablePage } from "@/lib/insight-surveys";
import { logError } from "@/lib/server-log";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const query = new URL(request.url).searchParams;
    const page = Number(query.get("page") ?? 1);
    const pageSize = Number(query.get("pageSize") ?? 25);
    const version = query.get("version") ?? undefined;
    const record = query.get("record") ?? undefined;
    const sortColumn = query.get("sort") ?? "record";
    const sortDirection = query.get("direction") === "desc" ? "desc" : "asc";
    const data = await getSurveyTablePage(id, page, pageSize, version, record, sortColumn, sortDirection);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const message = error instanceof Error ? error.message : "No se pudo cargar la tabla del cuestionario.";
    const expected = /^(Inicia sesión|No tienes acceso|No tienes permiso|Selecciona|Alguna versión)/.test(message);
    if (!expected) logError("Error al consultar la tabla del cuestionario", error);
    return NextResponse.json({ error: expected ? message : "No se pudo cargar la tabla del cuestionario." }, { status: expected ? 400 : 500 });
  }
}
