/**
 * Bound Supabase Auth requests (session refresh, JWKS, user lookup) so a
 * stalled network call fails fast instead of holding the render for minutes
 * under Node's default headers timeout. Data API calls keep their own pace.
 */
export function authFetchWithTimeout(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes("/auth/v1/")) return fetch(input, init);
    return fetch(input, {
      ...init,
      signal: AbortSignal.any([
        ...(init?.signal ? [init.signal] : []),
        AbortSignal.timeout(timeoutMs),
      ]),
    });
  };
}
