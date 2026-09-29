"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { findActiveNav, type NavGroup } from "@/lib/nav";
import { NavIcon } from "./nav-icon";

/**
 * Bottom band of sibling modules (<768px), shown as icons + labels with a
 * horizontal scroll. Hidden when the group has a single module or the route
 * isn't in the nav. Edge gradients hint that the band continues.
 */
export function MobileModuleBar({ nav }: { nav: NavGroup[] }) {
  const pathname = usePathname();
  const { group, active } = findActiveNav(nav, pathname);

  if (!group || group.items.length < 2) return null;

  return (
    <nav className="insight-shell-chrome relative shrink-0 border-t md:hidden">
      <div className="flex snap-x justify-center gap-2 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {group.items.map((it) => {
          const isActive = it.href === active?.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-w-[68px] shrink-0 snap-start flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition ${
                isActive ? "shell-header-item is-active" : "shell-header-item"
              }`}
            >
              <NavIcon name={it.icon} className="h-5 w-5 shrink-0" />
              <span className="max-w-[76px] truncate text-[10px] font-medium leading-none">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
