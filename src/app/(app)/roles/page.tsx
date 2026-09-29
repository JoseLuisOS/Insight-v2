import { redirect } from "next/navigation";
import { RolesManager } from "@/components/insight/roles-manager";
import { currentSysadmin } from "@/lib/insight-catalog";
import { listRoleWorkspace } from "@/lib/insight-roles";

export default async function RolesPage() {
  if (!await currentSysadmin()) redirect("/dashboard");
  return <RolesManager initialWorkspace={await listRoleWorkspace()} />;
}
