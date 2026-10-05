import { NextResponse } from "next/server";
import { currentSysadmin } from "@/lib/insight-catalog";
import { listOrganizations, saveOrganization } from "@/lib/insight-organizations";
import { logError } from "@/lib/server-log";

const forbidden = () => NextResponse.json({ error: "Acceso exclusivo de sysadmin." }, { status: 403 });

export async function GET() {
  if (!await currentSysadmin()) return forbidden();
  return NextResponse.json(await listOrganizations());
}

async function mutate(request: Request, edit: boolean) {
  if (!await currentSysadmin()) return forbidden();
  try {
    const row = await saveOrganization(await request.json(), edit);
    return NextResponse.json(row, { status: edit ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la organización.";
    const known = /^(Datos|Campo|Organización|El nombre|El prefijo|Zona horaria|Estado|No se pudo generar|Ya existe|La organización)/.test(message);
    if (!known) logError("Error en Organizaciones Insight", error);
    return NextResponse.json({ error: known ? message : "No se pudo guardar la organización." }, { status: known ? 400 : 500 });
  }
}

export async function POST(request: Request) { return mutate(request, false); }
export async function PATCH(request: Request) { return mutate(request, true); }
