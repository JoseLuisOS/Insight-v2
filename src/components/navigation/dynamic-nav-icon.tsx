"use client";

import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { normalizeLucideIconName } from "@/lib/catalog-code";

export function DynamicNavIcon({ name, className }: { name: string; className?: string }) {
  return <DynamicIcon name={normalizeLucideIconName(name) as IconName} className={className} size={18} strokeWidth={1.8}
    fallback={() => <span className={`inline-block h-4 w-4 ${className ?? ""}`} />} />;
}
