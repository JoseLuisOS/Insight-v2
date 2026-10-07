import "server-only";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { headers } from "next/headers";

const logDirectory = join(process.cwd(), "logs");
const logFile = join(logDirectory, "application.log");
let fileWarningShown = false;

function timestamp(date: Date): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

export function logError(message: string, error: unknown): void {
  const prefix = `[${timestamp(new Date())}] [ERROR] ${message}`;
  console.error(prefix, error);

  try {
    mkdirSync(logDirectory, { recursive: true });
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    appendFileSync(logFile, `${prefix} — ${detail.replace(/\r?\n/g, "\\n")}\n`, "utf8");
  } catch (fileError) {
    if (!fileWarningShown) {
      fileWarningShown = true;
      console.error(`[${timestamp(new Date())}] [ERROR] No se pudo escribir ${logFile}`, fileError);
    }
  }
}

export function startTiming(): number {
  return performance.now();
}

/** Log slow server stages with bounded, non-sensitive context. */
export async function logDuration(stage: string, started: number, details: Record<string, number> = {}): Promise<void> {
  const durationMs = Math.round(performance.now() - started);
  const thresholdMs = Number(process.env.INSIGHT_SLOW_LOG_MS ?? 1000);
  if (durationMs < (Number.isFinite(thresholdMs) ? thresholdMs : 1000)) return;
  const fields = Object.entries(details).map(([key, value]) => `${key}=${value}`).join(" ");
  let requestId: string | null = null;
  try { requestId = (await headers()).get("x-insight-request-id"); } catch { /* Outside a request. */ }
  const line = `[${timestamp(new Date())}] [SLOW] ${stage}${requestId ? ` request_id=${requestId}` : ""} duration_ms=${durationMs}${fields ? ` ${fields}` : ""}`;
  console.warn(line);
  try {
    mkdirSync(logDirectory, { recursive: true });
    appendFileSync(logFile, `${line}\n`, "utf8");
  } catch (fileError) {
    if (!fileWarningShown) {
      fileWarningShown = true;
      console.error(`[${timestamp(new Date())}] [ERROR] No se pudo escribir ${logFile}`, fileError);
    }
  }
}
