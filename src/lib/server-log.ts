import "server-only";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

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
