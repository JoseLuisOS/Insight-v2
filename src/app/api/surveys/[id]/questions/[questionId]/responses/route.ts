import { NextResponse } from "next/server";
import { getSurveyQuestionResponsePage } from "@/lib/insight-surveys";
import { logError } from "@/lib/server-log";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const { id, questionId } = await params;
    const query = new URL(request.url).searchParams;
    const page = Number(query.get("page") ?? 1);
    const version = query.get("version") ?? undefined;
    const data = await getSurveyQuestionResponsePage(id, questionId, page, version);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const message = error instanceof Error ? error.message : "No se pudieron cargar los registros.";
    const expected = /^(Inicia sesión|No tienes acceso|No tienes permiso|Selecciona|Alguna versión)/.test(message);
    if (!expected) logError("Error al consultar respuestas de pregunta", error);
    return NextResponse.json({ error: expected ? message : "No se pudieron cargar los registros." }, { status: expected ? 400 : 500 });
  }
}
