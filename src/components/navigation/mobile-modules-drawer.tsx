"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { findActiveNav, type NavGroup } from "@/lib/nav";
import { NavIcon } from "./nav-icon";
import { SessionAccountFooter, type ShellUser } from "./session-account-footer";
import { useMobileNav } from "./mobile-nav-context";

/**
 * Mobile navigation drawer (<768px). Flat list of groups: tapping one goes to
 * its first module and the bottom band (`MobileModuleBar`) shows the rest.
 */
export function MobileModulesDrawer({ nav, user }: { nav: NavGroup[]; user: ShellUser }) {
  const { open, setOpen } = useMobileNav();
  const pathname = usePathname();
  const { group: activeGroup } = findActiveNav(nav, pathname);

  return (
    <div className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={() => setOpen(false)}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        className={`insight-sidebar-surface absolute left-0 top-0 flex h-full w-[82%] max-w-[320px] flex-col border-r shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
          <div className="shell-icon-tile flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
            {(user.orgName ?? "Intersel Insight").charAt(0).toUpperCase()}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--sidebar-foreground)]">
            {user.orgName ?? "Intersel Insight"}
          </p>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="shell-control shrink-0 rounded-md border border-transparent p-1 transition"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Módulos</p>
          {nav.map((g) => {
            const isActive = g.label === activeGroup?.label;
            return (
              <Link
                key={g.label}
                href={g.items[0]?.href ?? "#"}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive ? "shell-nav-item is-active" : "shell-nav-item"
                }`}
              >
                <NavIcon name={g.icon} className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{g.label}</span>
                {g.items.length > 1 && (
                  <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {g.items.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <SessionAccountFooter user={user} />
        </div>
      </aside>
    </div>
  );
}
