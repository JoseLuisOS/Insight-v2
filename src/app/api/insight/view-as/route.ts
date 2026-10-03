import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSysadmin } from "@/lib/insight-catalog";
import { findViewableUser, VIEW_AS_COOKIE } from "@/lib/view-as";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function actor(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && await isSysadmin(user.id) ? user.id : null;
}

export async function POST(request: Request) {
  const actorId = await actor(request);
  if (!actorId) return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const { userId, organizationId } = (input ?? {}) as Record<string, unknown>;
  if (typeof userId !== "string" || typeof organizationId !== "string" || !uuid.test(userId) || !uuid.test(organizationId) || userId === actorId) {
    return NextResponse.json({ error: "Usuario u organización inválidos." }, { status: 400 });
  }
  if (!await findViewableUser(userId, organizationId)) {
    return NextResponse.json({ error: "El usuario debe tener una membresía activa en esta organización." }, { status: 400 });
  }
  (await cookies()).set(VIEW_AS_COOKIE, `${userId}:${organizationId}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 4 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const actorId = await actor(request);
  if (!actorId) return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  (await cookies()).delete(VIEW_AS_COOKIE);
  return NextResponse.json({ ok: true });
}
