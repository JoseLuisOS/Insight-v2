import "server-only";
import { appendFileSync, mkdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { headers } from "next/headers";

type Level = "INFO" | "SLOW" | "WARN" | "ERROR";
type FieldValue = string | number | boolean | null | undefined;
export type LogFields = Record<string, FieldValue>;

const logDirectory = join(process.cwd(), "logs");
const logFile = join(logDirectory, "application.log");
// One rotated copy keeps the log readable without growing without bound.
const maxLogBytes = 5 * 1024 * 1024;
let fileWarningShown = false;

function timestamp(date: Date): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/** Replace record IDs in a path so logs group by route without exposing identifiers. */
export function logPath(pathname: string): string {
  return pathname.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id");
}

function formatValue(value: Exclude<FieldValue, null | undefined>): string {
  const text = String(value).replace(/\s+/g, "_").replace(/"/g, "'");
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

function formatFields(fields: LogFields): string {
  return Object.entries(fields)
    .filter((entry): entry is [string, Exclude<FieldValue, null | undefined>] => entry[1] !== null && entry[1] !== undefined)
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(" ");
}

function appendLine(line: string): void {
  try {
    mkdirSync(logDirectory, { recursive: true });
    try {
      if (statSync(logFile).size > maxLogBytes) renameSync(logFile, join(logDirectory, "application.1.log"));
    } catch { /* No file yet. */ }
    appendFileSync(logFile, `${line}\n`, "utf8");
  } catch (fileError) {
    if (!fileWarningShown) {
      fileWarningShown = true;
      console.error(`[${timestamp(new Date())}] [ERROR] log.file_unavailable path=${logFile}`, fileError);
    }
  }
}

async function currentRequestId(): Promise<string | null> {
  try { return (await headers()).get("x-insight-request-id"); } catch { return null; /* Outside a request. */ }
}

/**
 * Write one `[time] [LEVEL] event key=value…` line to the console and
 * `logs/application.log`. Pass only bounded, non-sensitive values: never SQL,
 * parameters, tokens, emails or record contents.
 */
export async function logEvent(level: Level, event: string, fields: LogFields = {}): Promise<void> {
  const requestId = fields.request_id ?? await currentRequestId();
  const body = formatFields({ request_id: requestId, ...fields });
  const line = `[${timestamp(new Date())}] [${level}] ${event}${body ? ` ${body}` : ""}`;
  if (level === "ERROR") console.error(line);
  else if (level === "INFO") console.info(line);
  else console.warn(line);
  appendLine(line);
}

/** Error name, message and network code (e.g. `UND_ERR_HEADERS_TIMEOUT`) from an error and its cause. */
export function describeError(error: unknown): LogFields {
  if (!(error instanceof Error)) return { error: String(error) };
  const cause = error.cause as { code?: unknown; name?: unknown } | undefined;
  const code = (error as { code?: unknown }).code ?? cause?.code;
  return {
    error: error.name,
    message: error.message.split(/\r?\n/)[0],
    code: typeof code === "string" || typeof code === "number" ? code : undefined,
    cause: typeof cause?.name === "string" ? cause.name : undefined,
  };
}

export function logError(message: string, error: unknown, fields: LogFields = {}): void {
  void logEvent("ERROR", "app.error", { ...fields, context: message, ...describeError(error) });
  // The stack helps locally; the file keeps the bounded single-line summary.
  if (process.env.NODE_ENV === "development" && error instanceof Error && error.stack) console.error(error.stack);
}

export function startTiming(): number {
  return performance.now();
}

export function slowThresholdMs(): number {
  const threshold = Number(process.env.INSIGHT_SLOW_LOG_MS ?? 1000);
  return Number.isFinite(threshold) ? threshold : 1000;
}

/** Log slow server stages with bounded, non-sensitive context. */
export async function logDuration(stage: string, started: number, details: LogFields = {}): Promise<void> {
  const durationMs = Math.round(performance.now() - started);
  if (durationMs < slowThresholdMs()) return;
  await logEvent("SLOW", stage, { duration_ms: durationMs, ...details });
}
