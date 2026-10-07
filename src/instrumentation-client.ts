import { NAVIGATION_START_EVENT, type NavigationStart } from "@/lib/navigation-events";

export function onRouterTransitionStart(url: string) {
  try {
    const start: NavigationStart = {
      path: new URL(url, window.location.origin).pathname,
      started: performance.now(),
    };
    window.__insightNavigationStart = start;
    window.dispatchEvent(new CustomEvent<NavigationStart>(NAVIGATION_START_EVENT, { detail: start }));
  } catch {
    // Instrumentation must never block navigation.
  }
}
