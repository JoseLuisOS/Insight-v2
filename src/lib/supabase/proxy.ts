import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { describeError, logEvent, logPath } from "@/lib/server-log";
import { authFetchWithTimeout } from "./fetch-timeout";

/**
 * Refreshes the Supabase auth session on every matched request and guards
 * protected routes. Called from the root `proxy.ts` (Next.js 16's renamed
 * Middleware). Keep this lightweight — it runs before every render.
 */
export async function updateSession(request: NextRequest) {
  const started = performance.now();
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-insight-request-id", requestId);
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });
  let response = next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: authFetchWithTimeout(5000) },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
          response = next();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Verify the JWT locally with the project's asymmetric signing key.
  let authTimer: ReturnType<typeof setTimeout> | undefined;
  const authResult = await Promise.race([
    supabase.auth.getClaims().then((result) => ({ ...result, timedOut: false })),
    new Promise<{ data: null; error: null; timedOut: true }>((resolve) => {
      authTimer = setTimeout(() => resolve({ data: null, error: null, timedOut: true }), 7000);
    }),
  ]).finally(() => clearTimeout(authTimer));
  const { data, error, timedOut } = authResult;
  const claims = data?.claims;
  const authDuration = Math.round(performance.now() - started);
  const { pathname } = request.nextUrl;
  // Local JWT verification takes a few milliseconds; more means a network call.
  if (authDuration >= 250) {
    await logEvent("SLOW", "proxy.claims", { request_id: requestId, duration_ms: authDuration, path: logPath(pathname), alg: data?.header?.alg });
  }

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/solicitar-acceso") ||
    pathname.startsWith("/p/") || // public published pages
    pathname.startsWith("/join/") || // invite acceptance
    pathname === "/";

  const redirectWithSession = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    redirect.headers.set("x-insight-request-id", requestId);
    return redirect;
  };

  if (timedOut || error?.name === "AuthRetryableFetchError") {
    await logEvent("ERROR", "proxy.claims_unavailable", { request_id: requestId, duration_ms: authDuration, timed_out: timedOut, path: logPath(pathname), ...(error ? describeError(error) : {}) });
    const unavailable = new NextResponse("No se pudo validar la sesión. Intenta de nuevo.", { status: 503 });
    response.cookies.getAll().forEach((cookie) => unavailable.cookies.set(cookie));
    unavailable.headers.set("x-insight-request-id", requestId);
    unavailable.headers.set("Retry-After", "5");
    return unavailable;
  }

  if (!claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectWithSession(url);
  }

  // Accounts are admin-provisioned with a temporary password (no public
  // signup — see src/app/login/actions.ts). Until it's changed, every
  // authenticated route except the change-password page itself redirects
  // there, so a temp password can't be used to browse the app.
  if (
    claims?.app_metadata?.must_change_password &&
    !pathname.startsWith("/change-password") &&
    !pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/change-password";
    return redirectWithSession(url);
  }

  // Framing policy: public published pages are embeddable anywhere; the rest of
  // the app may only be framed by itself (anti-clickjacking).
  response.headers.set(
    "Content-Security-Policy",
    pathname.startsWith("/p/") ? "frame-ancestors *" : "frame-ancestors 'self'",
  );
  response.headers.set("x-insight-request-id", requestId);

  return response;
}
