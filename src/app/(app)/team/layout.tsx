import { requireCatalogAccess } from "@/lib/insight-catalog";
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireCatalogAccess("usuarios");
  return children;
}
