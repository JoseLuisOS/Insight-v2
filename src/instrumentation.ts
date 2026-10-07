import type { Instrumentation } from "next";

/** Catch render, action and route errors that bypass local handlers. */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const failure = error instanceof Error ? error : new Error(String(error));
  console.error(`[REQUEST_ERROR] ${JSON.stringify({
    method: request.method,
    requestId: request.headers["x-insight-request-id"],
    route: context.routePath,
    type: context.routeType,
    digest: "digest" in failure ? failure.digest : undefined,
    name: failure.name,
    message: failure.message,
  })}`);
};
