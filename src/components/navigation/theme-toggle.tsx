"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "insight-theme";

function currentTheme(): Theme {
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// The <html> class is the source of truth (set pre-paint by the root layout script).
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Icon button toggling light/dark. The class itself is set pre-paint by the inline script in the root layout. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => "light" as Theme);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    const classes = document.documentElement.classList;
    classes.remove("light", "dark");
    classes.add(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
  }

  const goingTo: Theme = theme === "light" ? "dark" : "light";
  const Icon = goingTo === "dark" ? Moon : Sun;
  const label = goingTo === "dark" ? "Modo oscuro" : "Modo claro";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={`shell-control grid h-8 w-8 shrink-0 place-items-center rounded-md border transition hover:border-primary/40 hover:text-primary ${className ?? ""}`}
    >
      <Icon size={15} />
    </button>
  );
}
