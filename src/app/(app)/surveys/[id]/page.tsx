import { SurveyDetailView } from "@/components/insight/survey-detail-view";
import { getSurveyDetail } from "@/lib/insight-surveys";

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SurveyDetailView detail={await getSurveyDetail(id)} />;
}
