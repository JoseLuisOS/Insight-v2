import { SurveysManager } from "@/components/insight/surveys-manager";
import { listSurveys } from "@/lib/insight-surveys";
import { createClient } from "@/lib/supabase/server";
import { getViewedUser } from "@/lib/view-as";

export default async function SurveysPage() {
  const data = await listSurveys();
  const { data: { user } } = await (await createClient()).auth.getUser();
  const viewedUser = user ? await getViewedUser(user.id) : null;
  return <SurveysManager key={viewedUser?.organizationId ?? "all"} {...data} initialOrganizationId={viewedUser?.organizationId ?? "all"} />;
}
