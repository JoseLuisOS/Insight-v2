import { requireCatalogAccess } from "@/lib/insight-catalog";
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireCatalogAccess("dashboards");
  return children;
}
