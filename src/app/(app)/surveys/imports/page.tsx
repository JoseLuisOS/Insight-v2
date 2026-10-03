import { SurveyImportsView } from "@/components/insight/survey-imports-view";
import { getSurveyImportWorkspace } from "@/lib/insight-survey-imports";

export default async function SurveyImportsPage() {
  return <SurveyImportsView {...await getSurveyImportWorkspace()} />;
}
