import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { DashboardView } from "@/components/dashboard-view";
import { PublishDialog } from "@/components/publish-dialog";
import {
  getDashboardPublication,
  publishDashboard,
} from "@/app/(app)/dashboards/publish-actions";
import { getPublicationViewCount } from "@/app/(app)/charts/publish-actions";
import { getProfileContext } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboards";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function DashboardViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getDashboardData(id);
  if (!data) notFound();

  const [{ profile }, publication] = await Promise.all([
    getProfileContext(),
    getDashboardPublication(id),
  ]);
  const canPublish = !!(profile?.can_publish || profile?.role === "admin");
  const viewCount = publication.token ? await getPublicationViewCount("dashboard", id) : 0;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboards" className="text-sm text-primary hover:underline">
            ← Dashboards
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{data.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <AutoRefresh />
          <Link
            href={`/dashboards/${id}/edit`}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Editar
          </Link>
        </div>
      </div>
      <DashboardView items={data.items} filters={data.filters} exportName={data.name} />

      <div className="mt-6">
        <PublishDialog
          resourceId={id}
          resourceType="dashboard"
          action={publishDashboard}
          initial={publication}
          siteUrl={SITE_URL}
          canPublish={canPublish}
          viewCount={viewCount}
        />
      </div>
    </div>
  );
}
