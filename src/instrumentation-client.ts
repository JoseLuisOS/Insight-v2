type NavigationStart = { path: string; started: number };

declare global {
  interface Window { __insightNavigationStart?: NavigationStart }
}

export function onRouterTransitionStart(url: string) {
  try {
    window.__insightNavigationStart = {
      path: new URL(url, window.location.origin).pathname,
      started: performance.now(),
    };
  } catch {
    // Instrumentation must never block navigation.
  }
}
