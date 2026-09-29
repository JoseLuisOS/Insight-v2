"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { findActiveNav, type NavGroup } from "@/lib/nav";
import { NavIcon } from "./nav-icon";
import { Clock } from "./clock";
import { FullscreenButton } from "./fullscreen-button";
import { ReloadButton } from "./reload-button";
import { useMobileNav } from "./mobile-nav-context";

/**
 * Top bar of the content area.
 * - Mobile (<768px): hamburger (opens the modules drawer) + title; sibling
 *   modules live in the bottom band (`MobileModuleBar`).
 * - Desktop: group (eyebrow) + module (title) · quick-access strip · actions.
 * Height and colour match the sidebar header.
 */
export function PanelHeader({ nav }: { nav: NavGroup[] }) {
  const pathname = usePathname();
  const { toggle } = useMobileNav();
  const { group, active } = findActiveNav(nav, pathname);

  const hamburger = (
    <button
      type="button"
      onClick={toggle}
      aria-label="Abrir menú de módulos"
      className="flex shrink-0 items-center justify-center px-4 text-muted-foreground transition hover:text-primary md:hidden"
    >
      <Menu size={22} />
    </button>
  );

  // Unknown route: keep a minimal mobile header so the drawer stays reachable.
  if (!group || !active) {
    return (
      <header className="insight-shell-chrome flex h-14 shrink-0 items-center gap-1 border-b md:hidden">
        {hamburger}
        <span className="truncate text-sm font-semibold text-foreground">Intersel Insight</span>
      </header>
    );
  }

  return (
    <header className="insight-shell-chrome flex h-16 shrink-0 items-stretch border-b">
      {hamburger}

      <div className="flex min-w-0 flex-1 flex-col justify-center pr-3 md:flex-none md:shrink-0 md:pl-5 md:pr-6">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{group.label}</p>
        <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-foreground md:text-lg">
          {active.label}
        </h1>
      </div>

      {/* Center: group modules as segments (desktop only) */}
      <div className="hidden flex-1 items-stretch justify-center md:flex">
        {group.items.map((it, idx) => {
          const isActive = it.href === active.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              title={it.label}
              aria-current={isActive ? "page" : undefined}
              className={`flex w-[68px] items-center justify-center border-l border-border transition ${
                idx === group.items.length - 1 ? "border-r" : ""
              } ${
                isActive
                  ? "shell-header-item is-active"
                  : "shell-header-item"
              }`}
            >
              <NavIcon name={it.icon} className="h-[18px] w-[18px]" />
            </Link>
          );
        })}
      </div>

      {/* Right: bell (placeholder) + reload; clock + fullscreen on desktop */}
      <div className="ml-auto flex shrink-0 items-center gap-2.5 px-3 md:ml-0 md:px-5">
        {/* Placeholder: notifications are not built yet. */}
        <button
          type="button"
          title="Notificaciones"
          aria-label="Notificaciones"
          className="shell-control grid h-8 w-8 place-items-center rounded-md border transition hover:border-primary/40 hover:text-primary"
        >
          <Bell size={15} />
        </button>
        <ReloadButton />
        <div className="hidden items-center gap-2.5 md:flex">
          <Clock />
          <FullscreenButton />
        </div>
      </div>
    </header>
  );
}
