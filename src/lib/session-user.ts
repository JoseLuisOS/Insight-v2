import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { logDuration, startTiming } from "@/lib/server-log";

/** Reuse the verified Supabase identity across one server render. */
export const getSessionUser = cache(async () => {
  const started = startTiming();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  await logDuration("auth.get_claims", started);
  if (error || !data?.claims) return null;
  const { claims } = data;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});
