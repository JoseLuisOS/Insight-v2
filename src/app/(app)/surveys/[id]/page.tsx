import type { Metadata } from "next";
import { SurveyDetailView } from "@/components/insight/survey-detail-view";
import { getSurveyQuestionAnalytics, getSurveyQuestionResponsePage } from "@/lib/insight-surveys";

type SurveyPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string | string[]; question?: string | string[]; view?: string | string[]; page?: string | string[]; record?: string | string[]; variable?: string | string[] }>;
};

export async function generateMetadata({ searchParams }: SurveyPageProps): Promise<Metadata> {
  const selected = (await searchParams).view;
  const view = Array.isArray(selected) ? selected[0] : selected;
  const title = view === "table" ? "Tabla de registros" : view === "records" ? "Registros" : "Cuestionario";
  return { title: `Encuestas · ${title} · Intersel Insight` };
}

export default async function SurveyPage({ params, searchParams }: SurveyPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const versionId = Array.isArray(query.version) ? query.version[0] : query.version;
  const questionId = Array.isArray(query.question) ? query.question[0] : query.question;
  const view = Array.isArray(query.view) ? query.view[0] : query.view;
  const recordId = Array.isArray(query.record) ? query.record[0] : query.record;
  const variableId = Array.isArray(query.variable) ? query.variable[0] : query.variable;
  const requestedPage = Number(Array.isArray(query.page) ? query.page[0] : query.page);
  const [analysis, initialRecords] = await Promise.all([
    getSurveyQuestionAnalytics(id, versionId, questionId),
    view === "records" && questionId ? getSurveyQuestionResponsePage(id, questionId, requestedPage, versionId) : Promise.resolve(null),
  ]);
  const tableFocus = view === "table" && recordId ? { recordId, variableId: variableId ?? null } : null;
  return <SurveyDetailView key={`${analysis.version?.id ?? "none"}:${analysis.question?.id ?? "none"}:${view ?? "question"}:${recordId ?? ""}:${variableId ?? ""}`} analysis={analysis} initialRecords={initialRecords} tableFocus={tableFocus} />;
}
