import { NextResponse } from "next/server";
import { currentSysadmin } from "@/lib/insight-catalog";
import { createManagedPermissions, deleteManagedPermission, listManagedPermissions, updateManagedPermission } from "@/lib/insight-permissions";

async function authorized() { return Boolean(await currentSysadmin()); }
const forbidden = () => NextResponse.json({ error: "Acceso exclusivo de sysadmin." }, { status: 403 });

export async function GET() {
  if (!await authorized()) return forbidden();
  return NextResponse.json(await listManagedPermissions());
}

async function mutate(request: Request, method: "POST" | "PATCH" | "DELETE") {
  if (!await authorized()) return forbidden();
  try {
    const input = await request.json() as Record<string, unknown>;
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Datos inválidos.");
    let result;
    if (method === "POST") {
      if (typeof input.moduleCode !== "string" || !Array.isArray(input.actions) || input.actions.some((action) => typeof action !== "string")) throw new Error("Datos inválidos.");
      result = await createManagedPermissions(input.moduleCode, input.actions as string[]);
    } else if (method === "PATCH") {
      if (typeof input.code !== "string" || typeof input.description !== "string") throw new Error("Datos inválidos.");
      result = await updateManagedPermission(input.code, input.description);
    } else {
      if (typeof input.code !== "string") throw new Error("Datos inválidos.");
      result = await deleteManagedPermission(input.code);
    }
    return NextResponse.json(result, { status: method === "POST" ? 201 : 200 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    if (error instanceof Error && /^(Datos|Módulo|El módulo|Permiso|El permiso|Uno o varios)/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error en permisos Insight", error);
    return NextResponse.json({ error: "No se pudo guardar el permiso." }, { status: 500 });
  }
}

export async function POST(request: Request) { return mutate(request, "POST"); }
export async function PATCH(request: Request) { return mutate(request, "PATCH"); }
export async function DELETE(request: Request) { return mutate(request, "DELETE"); }
