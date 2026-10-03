import { redirect } from "next/navigation";
import { PermissionsManager } from "@/components/insight/permissions-manager";
import { currentSysadmin, listCatalog, requireCatalogAccess } from "@/lib/insight-catalog";
import { listManagedPermissions } from "@/lib/insight-permissions";

export default async function PermissionsPage() {
  if (!await currentSysadmin()) redirect("/dashboard");
  await requireCatalogAccess("insight_permissions");
  const [catalog, permissions] = await Promise.all([listCatalog(), listManagedPermissions()]);
  return <PermissionsManager initialGroups={catalog.groups} initialModules={catalog.modules} initialPermissions={permissions} />;
}
