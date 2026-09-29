import "server-only";
import { NextResponse } from "next/server";
import { currentSysadmin, saveCatalog, validateInput } from "@/lib/insight-catalog";

export async function catalogMutation(request: Request, kind: "group" | "module", code?: string) {
  const actorId = await currentSysadmin();
  if (!actorId) return NextResponse.json({ error: "Acceso exclusivo de sysadmin." }, { status: 403 });
  if (code && !/^[a-z0-9_]{2,40}$/.test(code)) return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  try {
    const input = validateInput(await request.json(), kind, !code);
    const row = await saveCatalog(kind, input, actorId, code);
    return NextResponse.json(row, { status: code ? 200 : 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    if (error instanceof Error && /^(Datos|Campo|ID|Grupo|Módulo|Nombre|Orden|Estado|Sin cambios|El componente|El panel|description|icon|active|visible)/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const dbError = error as { code?: string; constraint?: string };
    if (dbError.code === "23505") return NextResponse.json({ error: "Ya existe ese ID." }, { status: 409 });
    if (dbError.code === "23503") return NextResponse.json({ error: "El grupo padre no existe." }, { status: 400 });
    console.error("Error en catálogo Insight", error);
    return NextResponse.json({ error: "No se pudo guardar el componente." }, { status: 500 });
  }
}
