import type { LucideIcon } from "lucide-react";

type LucideModule = typeof import("lucide-react");

let lucide: Promise<LucideModule> | undefined;

/**
 * Loads the whole Lucide set as a single lazy chunk for catalog names outside
 * the static registry. `lucide-react/dynamic` declares one `import()` per icon
 * (~2,100 chunks), which every dev compilation of the panel had to process.
 */
export function loadLucideIcons() {
  return (lucide ??= import("lucide-react"));
}

/** Resolves a normalized kebab-case name (`user-cog`) to its icon component. */
export function findLucideIcon(lib: LucideModule, name: string): LucideIcon | undefined {
  // Skip the `Lucide*`/`*Icon` export aliases and the generic `Icon` component.
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name === "icon" || name.startsWith("lucide-") || name.endsWith("-icon")) return undefined;
  const exportName = name.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
  const candidate = (lib as unknown as Record<string, unknown>)[exportName];
  return candidate && typeof candidate === "object" && "$$typeof" in candidate ? candidate as LucideIcon : undefined;
}
