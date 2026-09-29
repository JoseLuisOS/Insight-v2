import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Intersel Insight is an internal, invite-only platform — there is no public
 * marketing/signup page. `/` just routes to the right place.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const { data: status } = await supabase.rpc("get_org_bootstrap_status");
  if (status?.organization_count === 0 && status?.is_platform_admin) redirect("/onboarding");
  redirect("/dashboard");
}
