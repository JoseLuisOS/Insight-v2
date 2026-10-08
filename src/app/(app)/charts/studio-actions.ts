"use server";

import { validateChartV2 } from "@/lib/chart-v2";
import { STUDIO_CHART_TYPES, type ChartSourceRef, type LoadedChartSource, type SourceCarry } from "@/lib/chart-studio";
import { loadChartSourceData } from "@/lib/chart-sources";
import { chartActor } from "@/lib/chart-v2-datasets";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNAVAILABLE = "La fuente no está disponible o no tienes acceso.";
const isType = (value: unknown) => STUDIO_CHART_TYPES.some((item) => item.type === value);
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

function cleanRef(ref: unknown): ChartSourceRef | null {
  if (!isObject(ref)) return null;
  if (ref.kind === "dataset") return typeof ref.datasetId === "string" && UUID.test(ref.datasetId) ? { kind: "dataset", datasetId: ref.datasetId } : null;
  if (ref.kind !== "survey" || typeof ref.instrumentId !== "string" || !UUID.test(ref.instrumentId)) return null;
  if (ref.versionId === undefined) return { kind: "survey", instrumentId: ref.instrumentId };
  return typeof ref.versionId === "string" && UUID.test(ref.versionId) ? { kind: "survey", instrumentId: ref.instrumentId, versionId: ref.versionId } : null;
}

function cleanCarry(carry: unknown): SourceCarry | undefined {
  if (!isObject(carry)) return undefined;
  const clean: SourceCarry = {};
  if (isType(carry.type)) clean.type = carry.type as SourceCarry["type"];
  if (typeof carry.title === "string" && carry.title.length <= 160) clean.title = carry.title;
  if (isObject(carry.survey) && isObject(carry.survey.codes)) {
    const entries = Object.entries(carry.survey.codes);
    if (entries.length <= 50 && entries.every(([key, value]) => UUID.test(key) && typeof value === "string" && value.length <= 200)) {
      try { clean.survey = { definition: validateChartV2(carry.survey.definition), codes: Object.fromEntries(entries) as Record<string, string> }; }
      catch { /* se descarta la definición de encuesta */ }
    }
  }
  if (isObject(carry.dataset) && isType(carry.dataset.type)) {
    try { if (JSON.stringify(carry.dataset).length <= 15000) clean.dataset = carry.dataset as unknown as SourceCarry["dataset"]; } catch { /* se descarta */ }
  }
  return clean;
}

export async function loadChartSource(ref: ChartSourceRef, carry?: SourceCarry): Promise<{ source: LoadedChartSource } | { error: string }> {
  await chartActor();
  const cleanedRef = cleanRef(ref);
  if (!cleanedRef) return { error: UNAVAILABLE };
  try {
    return { source: await loadChartSourceData(cleanedRef, cleanCarry(carry)) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!(error instanceof Error) || message.startsWith("NEXT_") || (error as { digest?: unknown }).digest) return { error: UNAVAILABLE };
    return { error: message || UNAVAILABLE };
  }
}
