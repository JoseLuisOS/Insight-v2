import type { Instrumentation } from "next";

// Node-only code (pg, fs) must be imported inside the NEXT_RUNTIME check so the
// Edge build of this file can drop it.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    registerNode();
  }
}

/** Catch render, action and route errors that bypass local handlers. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { onNodeRequestError } = await import("./instrumentation-node");
    await onNodeRequestError(error, request, context);
  } else {
    const failure = error instanceof Error ? error : new Error(String(error));
    console.error(`[ERROR] request.error ${JSON.stringify({ route: context.routePath, type: context.routeType, error: failure.name, message: failure.message })}`);
  }
};
