import { NextResponse } from "next/server";
import { deleteSurveyStudy } from "@/lib/insight-surveys";
import { logError } from "@/lib/server-log";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    await deleteSurveyStudy(id, body.confirm_name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    const message = error instanceof Error ? error.message : "No se pudo eliminar el estudio.";
    const expected = /^(Inicia sesión|No tienes acceso|No tienes permiso|Selecciona|Escribe|Espera)/.test(message);
    if (!expected) logError("Error al eliminar estudio", error);
    return NextResponse.json({ error: expected ? message : "No se pudo eliminar el estudio." }, { status: expected ? 400 : 500 });
  }
}
