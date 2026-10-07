"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { normalizeLucideIconName } from "@/lib/catalog-code";
import { findLucideIcon, loadLucideIcons } from "./lucide-icons";

export function DynamicNavIcon({ name, className }: { name: string; className?: string }) {
  const [loaded, setLoaded] = useState<{ name: string; Icon?: LucideIcon } | null>(null);

  useEffect(() => {
    let active = true;
    loadLucideIcons().then((lib) => {
      if (active) setLoaded({ name, Icon: findLucideIcon(lib, normalizeLucideIconName(name)) });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [name]);

  const Icon = loaded?.name === name ? loaded.Icon : undefined;
  if (!Icon) return <span className={`inline-block h-4 w-4 ${className ?? ""}`} />;
  return <Icon className={className} size={18} strokeWidth={1.8} />;
}
