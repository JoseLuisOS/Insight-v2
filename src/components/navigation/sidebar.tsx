"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { NavGroup } from "@/lib/nav";
import { NavIcon } from "./nav-icon";
import { SessionAccountFooter, type ShellUser } from "./session-account-footer";

const SIDEBAR_EXPANDED_W = 200;
const SIDEBAR_RAIL_W = 64;

export const SIDEBAR_RAIL_KEY = "insight-sidebar-rail";
export const SIDEBAR_GROUPS_KEY = "insight-sidebar-groups";

interface Props {
  nav: NavGroup[];
  user: ShellUser;
  initialRail?: boolean;
  /** group label → collapsed. Missing labels are open. */
  initialCollapsed?: Record<string, boolean>;
}

function writeCookie(key: string, value: string) {
  try {
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Cookies blocked: state just won't persist.
  }
}

export function Sidebar({ nav, user, initialRail = false, initialCollapsed = {} }: Props) {
  const pathname = usePathname();
  const [rail, setRail] = useState(initialRail); // icons only
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(initialCollapsed);
  const [flyout, setFlyout] = useState<{ group: NavGroup; top: number } | null>(null);
  const flyoutTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(flyoutTimer.current), []);

  function updateRail(value: boolean) {
    setRail(value);
    writeCookie(SIDEBAR_RAIL_KEY, String(value));
  }

  function updateCollapsed(value: Record<string, boolean>) {
    setCollapsed(value);
    writeCookie(SIDEBAR_GROUPS_KEY, JSON.stringify(value));
  }

  function toggleGroup(label: string) {
    updateCollapsed({ ...collapsed, [label]: !collapsed[label] });
  }

  // From rail mode: expand the sidebar leaving ONLY the chosen group open.
  function openGroup(label: string) {
    const next: Record<string, boolean> = {};
    nav.forEach((g) => {
      if (g.collapsible !== false) next[g.label] = g.label !== label;
    });
    updateCollapsed(next);
    updateRail(false);
    setFlyout(null);
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  function openFlyout(group: NavGroup, top: number) {
    if (!rail || group.items.length === 0) return;
    window.clearTimeout(flyoutTimer.current);
    setFlyout({ group, top });
  }
  function closeFlyout() {
    window.clearTimeout(flyoutTimer.current);
    flyoutTimer.current = window.setTimeout(() => setFlyout(null), 120);
  }
  function keepFlyout() {
    window.clearTimeout(flyoutTimer.current);
  }

  return (
    <aside
      style={{ width: rail ? SIDEBAR_RAIL_W : SIDEBAR_EXPANDED_W }}
      className="insight-sidebar-surface relative hidden h-full shrink-0 flex-col border-r border-[var(--sidebar-border)] transition-[width] duration-200 md:flex"
    >
      {/* Header (fixed) */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--sidebar-border)] px-3">
        <div className="shell-icon-tile flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
          {(user.orgName ?? "Intersel Insight").charAt(0).toUpperCase()}
        </div>
        {!rail && (
          <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-[var(--sidebar-foreground)]">
            {user.orgName ?? "Intersel Insight"}
          </p>
        )}
        <button
          onClick={() => updateRail(!rail)}
          className="shell-control shrink-0 rounded-md border border-transparent p-1 transition"
          title={rail ? "Expandir menú" : "Retraer menú"}
          aria-label={rail ? "Expandir menú" : "Retraer menú"}
        >
          {rail ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav (scrollable) */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {nav.map((group) => {
          const collapsible = group.collapsible !== false;
          const open = rail ? true : !collapsible || !collapsed[group.label];
          return (
            <div
              key={group.label}
              className="mb-3"
              onMouseEnter={(e) => openFlyout(group, e.currentTarget.getBoundingClientRect().top)}
              onMouseLeave={closeFlyout}
            >
              {!rail ? (
                collapsible ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="shell-nav-item flex w-full items-center gap-2 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                  >
                    <NavIcon name={group.icon} className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left">{group.label}</span>
                    <span className={`transition-transform ${open ? "rotate-90" : ""}`}>›</span>
                  </button>
                ) : (
                  <div className="shell-nav-item flex items-center gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <NavIcon name={group.icon} className="h-3.5 w-3.5" />
                    <span className="flex-1">{group.label}</span>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => openGroup(group.label)}
                  onFocus={(e) => openFlyout(group, e.currentTarget.getBoundingClientRect().top)}
                  onBlur={closeFlyout}
                  title={`Abrir ${group.label}`}
                  className="shell-nav-item relative mb-1 flex w-full justify-center rounded-md py-2 transition"
                >
                  <NavIcon name={group.icon} className="h-4 w-4" />
                </button>
              )}

              {!rail && open && (
                <ul className="relative ml-3 mt-1 space-y-0.5 pl-3 before:absolute before:bottom-[10px] before:left-0 before:top-0 before:w-px before:bg-border">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                            active
                              ? "shell-nav-item is-active"
                              : "shell-nav-item"
                          }`}
                        >
                          <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer (fixed: session always visible) */}
      <div className="shrink-0 border-t border-[var(--sidebar-border)] px-2 py-3">
        <SessionAccountFooter user={user} rail={rail} />
      </div>

      {rail && flyout && (
        <div
          aria-label={`Módulos de ${flyout.group.label}`}
          className="absolute left-full z-30 min-w-[190px] overflow-hidden rounded-r-xl border border-l-0 border-border bg-card/95 shadow-[0_10px_24px_rgb(0_0_0_/_0.18)] backdrop-blur-sm"
          onFocus={keepFlyout}
          onMouseEnter={keepFlyout}
          onMouseLeave={closeFlyout}
          role="navigation"
          style={{ top: flyout.top }}
        >
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <NavIcon name={flyout.group.icon} className="h-[15px] w-[15px] text-primary" />
            <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">{flyout.group.label}</p>
          </div>
          <div className="relative my-1.5 ml-[19px] grid gap-0.5 py-0.5 pl-3 before:absolute before:bottom-[11px] before:left-0 before:top-0 before:w-px before:bg-border">
            {flyout.group.items.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                onFocus={keepFlyout}
                className={`grid min-h-[36px] grid-cols-[17px_minmax(0,1fr)] items-center gap-2 rounded-l-md px-2 text-[0.75rem] font-semibold no-underline transition ${
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-primary"
                }`}
              >
                <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
