import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { VIEW_AS_COOKIE } from "@/lib/view-as";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(VIEW_AS_COOKIE);
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
