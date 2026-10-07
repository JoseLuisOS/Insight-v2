import type { Instrumentation } from "next";
import { warmInsightDb } from "@/lib/insight-db";
import { describeError, logEvent } from "@/lib/server-log";

/** Open SQL connections while the server starts so the first navigation does not pay for them. */
export function registerNode() {
  void warmInsightDb();
}

export const onNodeRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const failure = error instanceof Error ? error : new Error(String(error));
  const requestId = request.headers["x-insight-request-id"];
  await logEvent("ERROR", "request.error", {
    request_id: typeof requestId === "string" ? requestId : undefined,
    method: request.method,
    route: context.routePath,
    type: context.routeType,
    digest: "digest" in failure && typeof failure.digest === "string" ? failure.digest : undefined,
    ...describeError(failure),
  });
};
