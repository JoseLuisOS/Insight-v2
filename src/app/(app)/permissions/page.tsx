import { redirect } from "next/navigation";
import { PermissionsManager } from "@/components/insight/permissions-manager";
import { currentSysadmin, listCatalog } from "@/lib/insight-catalog";
import { listManagedPermissions } from "@/lib/insight-permissions";

export default async function PermissionsPage() {
  if (!await currentSysadmin()) redirect("/dashboard");
  const [catalog, permissions] = await Promise.all([listCatalog(), listManagedPermissions()]);
  return <PermissionsManager initialGroups={catalog.groups} initialModules={catalog.modules} initialPermissions={permissions} />;
}
