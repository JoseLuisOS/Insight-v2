import { SurveysManager } from "@/components/insight/surveys-manager";
import { listSurveys } from "@/lib/insight-surveys";
import { listUnfinishedSurveyImports } from "@/lib/insight-survey-imports";
import { createClient } from "@/lib/supabase/server";
import { getViewedUser } from "@/lib/view-as";

export default async function SurveysPage() {
  const [data, pendingImports, { data: { user } }] = await Promise.all([
    listSurveys(),
    listUnfinishedSurveyImports(),
    createClient().then((client) => client.auth.getUser()),
  ]);
  const viewedUser = user ? await getViewedUser(user.id) : null;
  return <SurveysManager key={viewedUser?.organizationId ?? "all"} {...data} pendingImports={pendingImports} initialOrganizationId={viewedUser?.organizationId ?? "all"} />;
}
