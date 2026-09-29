import { NextResponse } from "next/server";
import { currentSysadmin } from "@/lib/insight-catalog";
import { deleteInsightRole, listRoleWorkspace, saveInsightRole } from "@/lib/insight-roles";

const forbidden = () => NextResponse.json({ error: "Acceso exclusivo de sysadmin." }, { status: 403 });

export async function GET() {
  if (!await currentSysadmin()) return forbidden();
  return NextResponse.json(await listRoleWorkspace());
}

async function mutate(request: Request, method: "POST" | "PATCH" | "DELETE") {
  if (!await currentSysadmin()) return forbidden();
  try {
    const input = await request.json();
    const result = method === "DELETE" ? await deleteInsightRole(input?.id)
      : await saveInsightRole(input, method === "POST");
    return NextResponse.json(result ?? { ok: true }, { status: method === "POST" ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el rol.";
    const known = /^(Datos|Campo|Organización|Rol|Nombre|Descripción|Permisos|No se|Uno o varios|Selecciona|El rol|La organización|Ya existe|Quita)/.test(message);
    if (!known) console.error("Error en roles Insight", error);
    return NextResponse.json({ error: known ? message : "No se pudo guardar el rol." }, { status: known ? 400 : 500 });
  }
}

export async function POST(request: Request) { return mutate(request, "POST"); }
export async function PATCH(request: Request) { return mutate(request, "PATCH"); }
export async function DELETE(request: Request) { return mutate(request, "DELETE"); }
