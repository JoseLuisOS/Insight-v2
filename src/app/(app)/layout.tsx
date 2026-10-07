import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MobileModulesDrawer } from "@/components/navigation/mobile-modules-drawer";
import { MobileNavProvider } from "@/components/navigation/mobile-nav-context";
import { MobileModuleBar } from "@/components/navigation/mobile-module-bar";
import { PanelHeader } from "@/components/navigation/panel-header";
import {
  PanelHeaderProvider,
  PanelReloadBoundary,
} from "@/components/navigation/panel-header-context";
import type { ShellUser } from "@/components/navigation/session-account-footer";
import {
  Sidebar,
  SIDEBAR_GROUPS_KEY,
  SIDEBAR_RAIL_KEY,
} from "@/components/navigation/sidebar";
import { isSysadmin, listCatalog, userCatalogAccess } from "@/lib/insight-catalog";
import { NAV } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { getViewedUser } from "@/lib/view-as";
import { ViewAsBanner } from "@/components/insight/view-as-banner";
import { logDuration, startTiming } from "@/lib/server-log";
import { NavigationPerformance } from "@/components/navigation/navigation-performance";
import { NavigationLoader } from "@/components/navigation/navigation-loader";
import { getSessionUser } from "@/lib/session-user";

function parseCollapsed(raw: string | undefined): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const started = startTiming();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  await logDuration("shell.identity", started);
  const accessStarted = startTiming();
  const supabase = await createClient();
  const profileStarted = startTiming();
  const [admin, catalog, profileResult] = await Promise.all([
    isSysadmin(user.id),
    listCatalog(),
    supabase.rpc("get_my_profile").maybeSingle(),
  ]);
  await logDuration("shell.user_profile", profileStarted);
  const [actorAccess, viewedUser] = await Promise.all([
    userCatalogAccess(user.id, admin),
    admin ? getViewedUser(user.id) : Promise.resolve(null),
  ]);
  const access = new Set(actorAccess);
  if (viewedUser) {
    for (const code of await userCatalogAccess(viewedUser.userId, false)) access.add(code);
  }
  await logDuration("shell.access_catalog", accessStarted);
  const registeredItems = NAV.flatMap((group) => group.items);
  const catalogNav = catalog.groups.map((group) => {
    const fallback = NAV.find((item) => item.code === group.code);
    return {
      label: group.name,
      code: group.code,
      icon: group.icon ?? fallback?.icon,
      collapsible: fallback?.collapsible,
      items: catalog.modules.filter((module) => module.group_code === group.code && access.has(module.code))
        .map((module) => {
          const registered = registeredItems.find((item) => item.code === module.code);
          return registered
            ? { ...registered, label: module.name, icon: module.icon ?? registered.icon }
            : { label: module.name, href: `/workspace/${encodeURIComponent(module.code)}`, icon: module.icon ?? undefined, code: module.code };
        }),
    };
  })
    .filter((group) => group.items.length > 0 || (admin && group.code === "administracion"));
  // Insight is the sysadmin control plane, outside the managed catalog.
  const nav = admin ? [...catalogNav, NAV.find((group) => group.code === "insight")!] : catalogNav;

  // Name/avatar live in insight_core.core_user_profiles (scripts/008).
  const { data: myProfile } = profileResult as {
    data: { display_name: string | null; avatar_url: string | null } | null;
  };

  const shellUser: ShellUser = {
    name: myProfile?.display_name || user.email || null,
    avatarUrl: myProfile?.avatar_url ?? null,
    orgName: null,
  };

  // Sidebar state is persisted in cookies so the first paint already matches.
  const cookieStore = await cookies();
  const initialRail = cookieStore.get(SIDEBAR_RAIL_KEY)?.value === "true";
  const initialCollapsed = parseCollapsed(cookieStore.get(SIDEBAR_GROUPS_KEY)?.value);
  await logDuration("shell.total", started);

  return (
    <MobileNavProvider>
      <PanelHeaderProvider>
        <div className="insight-app-shell flex h-dvh overflow-hidden bg-background">
          <NavigationPerformance />
          <Sidebar
            nav={nav}
            user={shellUser}
            initialRail={initialRail}
            initialCollapsed={initialCollapsed}
          />
          <MobileModulesDrawer nav={nav} user={shellUser} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {viewedUser && <ViewAsBanner identifier={viewedUser.email ?? viewedUser.name} organization={viewedUser.organizationName} />}
            <PanelHeader nav={nav} />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <main className="min-h-0 flex-1 overflow-y-auto">
                <PanelReloadBoundary className="px-6 py-8">{children}</PanelReloadBoundary>
              </main>
              <NavigationLoader />
            </div>
            <MobileModuleBar nav={nav} />
          </div>
        </div>
      </PanelHeaderProvider>
    </MobileNavProvider>
  );
}
