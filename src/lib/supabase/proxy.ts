import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every matched request and guards
 * protected routes. Called from the root `proxy.ts` (Next.js 16's renamed
 * Middleware). Keep this lightweight — it runs before every render.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/solicitar-acceso") ||
    pathname.startsWith("/p/") || // public published pages
    pathname.startsWith("/join/") || // invite acceptance
    pathname === "/";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Accounts are admin-provisioned with a temporary password (no public
  // signup — see src/app/login/actions.ts). Until it's changed, every
  // authenticated route except the change-password page itself redirects
  // there, so a temp password can't be used to browse the app.
  if (
    user?.app_metadata?.must_change_password &&
    !pathname.startsWith("/change-password") &&
    !pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/change-password";
    return NextResponse.redirect(url);
  }

  // Framing policy: public published pages are embeddable anywhere; the rest of
  // the app may only be framed by itself (anti-clickjacking).
  response.headers.set(
    "Content-Security-Policy",
    pathname.startsWith("/p/") ? "frame-ancestors *" : "frame-ancestors 'self'",
  );

  return response;
}
