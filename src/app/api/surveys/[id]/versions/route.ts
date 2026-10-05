import { NextResponse } from "next/server";
import { deleteSurveyVersions } from "@/lib/insight-surveys";
import { logError } from "@/lib/server-log";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await deleteSurveyVersions(id, body.version_ids, body.confirm_name);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    const message = error instanceof Error ? error.message : "No se pudo eliminar el cuestionario.";
    const expected = /^(Inicia sesión|No tienes acceso|No tienes permiso|Selecciona|La selección|Alguna versión)/.test(message);
    if (!expected && !message.startsWith("Escribe el nombre exacto")) logError("Error al eliminar versiones de cuestionario", error);
    return NextResponse.json({ error: expected || message.startsWith("Escribe el nombre exacto") ? message : "No se pudo eliminar el cuestionario." }, { status: expected || message.startsWith("Escribe el nombre exacto") ? 400 : 500 });
  }
}
