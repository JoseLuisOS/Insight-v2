import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ question?: string | string[]; version?: string | string[]; page?: string | string[] }>;
};

export default async function LegacySurveyResponsesPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const question = Array.isArray(query.question) ? query.question[0] : query.question;
  const version = Array.isArray(query.version) ? query.version[0] : query.version;
  const page = Number(Array.isArray(query.page) ? query.page[0] : query.page);
  const target = new URLSearchParams();
  if (version) target.set("version", version);
  if (question) {
    target.set("question", question);
    target.set("view", "records");
    if (Number.isSafeInteger(page) && page > 1) target.set("page", String(page));
  } else {
    target.set("view", "table");
  }
  redirect(`/surveys/${id}?${target.toString()}`);
}
