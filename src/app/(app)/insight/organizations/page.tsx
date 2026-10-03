import { redirect } from "next/navigation";
import { currentSysadmin } from "@/lib/insight-catalog";
import { listOrganizations } from "@/lib/insight-organizations";
import { OrganizationsManager } from "@/components/insight/organizations-manager";

export default async function OrganizationsPage() {
  if (!await currentSysadmin()) redirect("/dashboard");
  const organizations = await listOrganizations();
  return <OrganizationsManager key={JSON.stringify(organizations)} initialOrganizations={organizations} />;
}
