import { redirect } from "next/navigation";
import { RolesManager } from "@/components/insight/roles-manager";
import { currentSysadmin, requireCatalogAccess } from "@/lib/insight-catalog";
import { listRoleWorkspace } from "@/lib/insight-roles";

export default async function RolesPage() {
  if (!await currentSysadmin()) redirect("/dashboard");
  await requireCatalogAccess("insight_roles");
  return <RolesManager initialWorkspace={await listRoleWorkspace()} />;
}
