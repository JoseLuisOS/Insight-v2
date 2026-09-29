import { redirect } from "next/navigation";
import { CatalogManager } from "@/components/insight/catalog-manager";
import { currentSysadmin, listCatalog } from "@/lib/insight-catalog";

export default async function InsightModulesPage() {
  if (!await currentSysadmin()) redirect("/dashboard");
  const catalog = await listCatalog();
  return <CatalogManager initialGroups={catalog.groups} initialModules={catalog.modules} />;
}
