import type { Metadata } from "next";
import { SurveyImportsView } from "@/components/insight/survey-imports-view";
import { getSurveyImportWorkspace } from "@/lib/insight-survey-imports";

export const metadata: Metadata = { title: "Encuestas · Importar cuestionario · Intersel Insight" };

export default async function SurveyImportsPage() {
  return <SurveyImportsView {...await getSurveyImportWorkspace()} />;
}
