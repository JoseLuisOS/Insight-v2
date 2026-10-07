import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { describeError, logDuration, logEvent, startTiming } from "@/lib/server-log";

let symmetricJwtReported = false;

/** Reuse the verified Supabase identity across one server render. */
export const getSessionUser = cache(async () => {
  const started = startTiming();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const alg = data?.header?.alg;
  await logDuration("auth.get_claims", started, { alg });
  if (error && error.name !== "AuthSessionMissingError") {
    await logEvent("WARN", "auth.get_claims_failed", { duration_ms: Math.round(performance.now() - started), ...describeError(error) });
  }
  // HS* tokens cannot be verified locally: each check becomes a call to Supabase Auth.
  if (alg?.startsWith("HS") && !symmetricJwtReported) {
    symmetricJwtReported = true;
    await logEvent("WARN", "auth.symmetric_jwt", { alg, effect: "network_verification_per_request" });
  }
  if (error || !data?.claims) return null;
  const { claims } = data;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});
