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
import { getProfileContext } from "@/lib/auth";
import { isSysadmin, listCatalog, userCatalogAccess } from "@/lib/insight-catalog";
import { NAV } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

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
  const { user, profile } = await getProfileContext();
  if (!user) redirect("/login");
  const admin = await isSysadmin(user.id);
  const [access, catalog] = await Promise.all([userCatalogAccess(user.id, admin), listCatalog()]);
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
          return registered ? { ...registered, label: module.name, icon: module.icon ?? registered.icon } : null;
        }).filter((item) => item !== null),
    };
  })
    .filter((group) => group.items.length > 0 || (admin && group.code === "administracion"));
  const controlItems = NAV.find((group) => group.code === "administracion")!.items.filter((item) => ["insight_roles", "insight_permissions"].includes(item.code ?? ""));
  const visibleCatalogNav = admin
    ? catalogNav.map((group) => group.code === "administracion" ? { ...group, items: [...group.items, ...controlItems] } : group)
    : catalogNav;
  // Insight is the sysadmin control plane, outside the managed catalog.
  const nav = admin ? [...visibleCatalogNav, NAV.find((group) => group.code === "insight")!] : visibleCatalogNav;

  const supabase = await createClient();

  // Name/avatar live in insight_core.core_user_profiles (scripts/008).
  const { data: myProfile } = (await supabase
    .rpc("get_my_profile")
    .maybeSingle()) as {
    data: { display_name: string | null; avatar_url: string | null } | null;
  };

  const shellUser: ShellUser = {
    name: myProfile?.display_name || profile?.display_name || user.email || null,
    avatarUrl: myProfile?.avatar_url ?? null,
    orgName: profile?.tenants?.name ?? null,
  };

  // Sidebar state is persisted in cookies so the first paint already matches.
  const cookieStore = await cookies();
  const initialRail = cookieStore.get(SIDEBAR_RAIL_KEY)?.value === "true";
  const initialCollapsed = parseCollapsed(cookieStore.get(SIDEBAR_GROUPS_KEY)?.value);

  return (
    <MobileNavProvider>
      <PanelHeaderProvider>
        <div className="flex h-dvh overflow-hidden bg-background">
          <Sidebar
            nav={nav}
            user={shellUser}
            initialRail={initialRail}
            initialCollapsed={initialCollapsed}
          />
          <MobileModulesDrawer nav={nav} user={shellUser} />
          <div className="flex min-w-0 flex-1 flex-col">
            <PanelHeader nav={nav} />
            <main className="min-h-0 flex-1 overflow-y-auto">
              <PanelReloadBoundary className="px-6 py-8">{children}</PanelReloadBoundary>
            </main>
            <MobileModuleBar nav={nav} />
          </div>
        </div>
      </PanelHeaderProvider>
    </MobileNavProvider>
  );
}
