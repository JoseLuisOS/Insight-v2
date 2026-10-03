import { requireCatalogAccess } from "@/lib/insight-catalog";

export default async function SurveysLayout({ children }: { children: React.ReactNode }) {
  await requireCatalogAccess("encuestas");
  return children;
}
