import type { Metadata } from "next";
import { requireCatalogAccess } from "@/lib/insight-catalog";

export const metadata: Metadata = { title: "Encuestas · Intersel Insight" };

export default async function SurveysLayout({ children }: { children: React.ReactNode }) {
  await requireCatalogAccess("encuestas");
  return children;
}
