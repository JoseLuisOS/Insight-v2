export type NavigationStart = { path: string; started: number };

/** Fired synchronously when a client navigation begins, before any server work or dev compilation. */
export const NAVIGATION_START_EVENT = "insight:navigation-start";

declare global {
  interface Window { __insightNavigationStart?: NavigationStart }
}
