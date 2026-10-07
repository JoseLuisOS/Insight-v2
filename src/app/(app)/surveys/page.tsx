import type { Metadata } from "next";
import { SurveysManager } from "@/components/insight/surveys-manager";
import { listSurveys } from "@/lib/insight-surveys";
import { listUnfinishedSurveyImports } from "@/lib/survey-import-access";
import { getSessionUser } from "@/lib/session-user";
import { getViewedUser } from "@/lib/view-as";

export const metadata: Metadata = { title: "Encuestas · Estudios · Intersel Insight" };

export default async function SurveysPage() {
  const [data, pendingImports, user] = await Promise.all([
    listSurveys(),
    listUnfinishedSurveyImports(),
    getSessionUser(),
  ]);
  const viewedUser = user ? await getViewedUser(user.id) : null;
  return <SurveysManager key={viewedUser?.organizationId ?? "all"} {...data} pendingImports={pendingImports} initialOrganizationId={viewedUser?.organizationId ?? "all"} />;
}
