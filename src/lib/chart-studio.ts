/** Contrato compartido (cliente y servidor) del editor único de Gráficas: fuentes, catálogo y adaptadores puros. */
import { CHART_V2_CATALOG, defaultChartV2, type ChartV2Definition, type ChartV2Result, type ChartV2Type, type ChartV2Variable } from "@/lib/chart-v2";
import type { ChartConfig, ChartType, Row } from "@/lib/charts";

export type StudioSourceKind = "survey" | "dataset";

/** Cascada de fuentes accesibles, cargada una vez al abrir el editor. Versiones de la más reciente a la más antigua. */
export type ChartSourceCatalog = {
  studies: { id: string; name: string; organizationName: string;
    instruments: { id: string; name: string; versions: { id: string; version: string }[] }[] }[];
  datasets: { id: string; name: string; rowCount: number; organizationName: string }[];
  /** Organizaciones donde el usuario puede subir datasets. */
  organizations: { id: string; name: string }[];
};

export type ChartSourceRef =
  | { kind: "survey"; instrumentId: string; versionId?: string }
  | { kind: "dataset"; datasetId: string };

export type ChartMapOption = { id: string; name: string; name_property: string; geojson: object };

/** Fuente cargada con la configuración inicial ya adaptada (o la guardada al editar). */
export type LoadedChartSource =
  | { kind: "survey"; instrumentId: string; instrumentName: string; versionId: string; version: string;
      versions: { id: string; version: string }[]; variables: ChartV2Variable[];
      definition: ChartV2Definition | null; result: ChartV2Result | null }
  | { kind: "dataset"; datasetId: string; name: string; organizationId: string; columns: string[]; rows: Row[];
      rowCount: number; maps: ChartMapOption[]; config: ChartConfig };

/** Lo que se conserva al cambiar de fuente. `codes` traduce IDs de variable de la fuente anterior a su código. */
export type SourceCarry = {
  type?: ChartType;
  title?: string;
  survey?: { definition: ChartV2Definition; codes: Record<string, string> };
  dataset?: ChartConfig;
};

export const STUDIO_CHART_TYPES: { type: ChartType; label: string }[] = [
  { type: "bar", label: "Barras" },
  { type: "line", label: "Línea" },
  { type: "area", label: "Área" },
  { type: "pie", label: "Pastel" },
  { type: "table", label: "Tabla" },
  { type: "kpi", label: "Indicador" },
  { type: "scatter", label: "Dispersión" },
  { type: "histogram", label: "Histograma" },
  { type: "boxplot", label: "Caja y bigotes" },
  { type: "map", label: "Mapa" },
];

/** Primera fuente por defecto: primer estudio › primer instrumento › versión más reciente; si no hay, el dataset más reciente. */
export function defaultSourceRef(catalog: ChartSourceCatalog): ChartSourceRef | null {
  for (const study of catalog.studies) {
    const instrument = study.instruments.find((item) => item.versions.length);
    if (instrument) return { kind: "survey", instrumentId: instrument.id, versionId: instrument.versions[0].id };
  }
  return catalog.datasets[0] ? { kind: "dataset", datasetId: catalog.datasets[0].id } : null;
}

/** Ubica una referencia en el catálogo; devuelve null si no es accesible. */
export function findCatalogSource(catalog: ChartSourceCatalog, ref: ChartSourceRef) {
  if (ref.kind === "dataset") {
    const dataset = catalog.datasets.find((item) => item.id === ref.datasetId);
    return dataset ? { kind: "dataset" as const, dataset } : null;
  }
  for (const study of catalog.studies) {
    const instrument = study.instruments.find((item) => item.id === ref.instrumentId);
    if (!instrument) continue;
    const version = ref.versionId ? instrument.versions.find((item) => item.id === ref.versionId) : instrument.versions[0];
    return version ? { kind: "survey" as const, study, instrument, version } : null;
  }
  return null;
}

/** Línea de la fuente plegada: «Encuesta · Estudio › Instrumento · v3» o «Dataset · nombre». */
export function sourceLabel(catalog: ChartSourceCatalog, ref: ChartSourceRef | null): string {
  const found = ref ? findCatalogSource(catalog, ref) : null;
  if (!found) return "Sin fuente";
  if (found.kind === "dataset") return `Dataset · ${found.dataset.name}`;
  return `Encuesta · ${found.study.name} › ${found.instrument.name} · v${found.version.version}`;
}

/** null si el tipo es compatible con la encuesta; si no, el motivo (para `title`). */
export function surveyTypeSupport(type: ChartType, variables: ChartV2Variable[]): string | null {
  if (type === "map") return "Solo disponible con fuentes Dataset.";
  const entry = CHART_V2_CATALOG.find((item) => item.type === type);
  if (!entry) return "Tipo no disponible.";
  if ((entry.numericX || entry.numericY) && !variables.some((item) => item.numeric)) return "Requiere una variable numérica.";
  return null;
}

/** null si el tipo es compatible con el dataset; si no, el motivo. */
export function datasetTypeSupport(type: ChartType, columns: string[]): string | null {
  if (!columns.length) return "El dataset no tiene columnas.";
  return STUDIO_CHART_TYPES.some((item) => item.type === type) ? null : "Tipo no disponible.";
}

/** Cambia el tipo de una definición de Encuesta ajustando variables numéricas y métrica. */
export function applySurveyType(definition: ChartV2Definition, type: ChartV2Type, variables: ChartV2Variable[]): ChartV2Definition {
  const entry = CHART_V2_CATALOG.find((item) => item.type === type)!;
  const numeric = variables.filter((item) => item.numeric);
  const isNumeric = (id?: string) => !!variables.find((item) => item.id === id)?.numeric;
  const x = entry.numericX && !isNumeric(definition.xVariableId) ? numeric[0]?.id : definition.xVariableId;
  const y = entry.numericY && !isNumeric(definition.yVariableId) ? numeric[1]?.id ?? numeric[0]?.id : definition.yVariableId;
  const metric = type === "histogram" || type === "boxplot" || type === "scatter" ? "count" : definition.metric;
  return { ...definition, type, xVariableId: x ?? definition.xVariableId, yVariableId: y, metric };
}

/** Variables usadas por una definición, como ID → código, para conservarlas al cambiar de versión o instrumento. */
export function surveyCarryCodes(definition: ChartV2Definition, variables: ChartV2Variable[]): Record<string, string> {
  const ids = [definition.xVariableId, definition.yVariableId, definition.groupVariableId,
    definition.filter?.variableId, ...(definition.filters ?? []).map((item) => item.variableId)];
  const codes: Record<string, string> = {};
  for (const id of ids) {
    const variable = id ? variables.find((item) => item.id === id) : undefined;
    if (variable) codes[variable.id] = variable.code;
  }
  return codes;
}

/** Definición inicial de Encuesta para una fuente recién cargada, conservando lo compatible de la anterior. */
export function adaptSurveyDefinition(carry: SourceCarry | undefined, variables: ChartV2Variable[],
  instrumentId: string, versionId: string): ChartV2Definition | null {
  if (!variables.length) return null;
  const base = defaultChartV2(instrumentId, versionId, variables[0].id);
  const previous = carry?.survey;
  const byCode = new Map(variables.map((item) => [item.code, item]));
  const find = (id?: string) => id && previous ? byCode.get(previous.codes[id] ?? "") : undefined;
  const mapFilter = (filter?: { variableId: string; value: string }) => {
    const variable = find(filter?.variableId);
    return variable && filter?.value ? { variableId: variable.id, value: filter.value } : undefined;
  };
  const filter = mapFilter(previous?.definition.filter);
  const filters = (previous?.definition.filters ?? []).map(mapFilter)
    .filter((item): item is { variableId: string; value: string } => !!item && item.variableId !== filter?.variableId)
    .filter((item, index, list) => list.findIndex((other) => other.variableId === item.variableId) === index);
  const definition: ChartV2Definition = previous
    ? { ...previous.definition, version: 2, source: base.source, xVariableId: find(previous.definition.xVariableId)?.id ?? base.xVariableId,
        yVariableId: find(previous.definition.yVariableId)?.id, groupVariableId: find(previous.definition.groupVariableId)?.id,
        filter, filters: filters.length ? filters : undefined }
    : { ...base, style: carry?.title ? { title: carry.title } : {} };
  const wanted = carry?.type ?? definition.type;
  const type = (surveyTypeSupport(wanted, variables) ? "bar" : wanted) as ChartV2Type;
  const adapted = applySurveyType(definition, type, variables);
  return type === "histogram" && !["count", "percent"].includes(adapted.metric) ? { ...adapted, metric: "count" } : adapted;
}

/** Configuración inicial de Dataset para una fuente recién cargada, conservando lo compatible de la anterior. */
export function adaptDatasetConfig(carry: SourceCarry | undefined, columns: string[], mapIds: string[]): ChartConfig {
  const previous = carry?.dataset;
  const keep = (column?: string) => column && columns.includes(column) ? column : undefined;
  const wanted = carry?.type ?? previous?.type ?? "bar";
  const mapId = previous?.mapId && mapIds.includes(previous.mapId) ? previous.mapId : mapIds[0];
  // Un mapa sin GeoJSON disponible no se puede guardar: se degrada a barras.
  const type = datasetTypeSupport(wanted, columns) || (wanted === "map" && !mapId) ? "bar" : wanted;
  return {
    ...(previous ?? {}),
    type,
    x: keep(previous?.x) ?? columns[0],
    y: keep(previous?.y) ?? columns[1] ?? columns[0],
    aggregation: previous?.aggregation ?? "sum",
    mapId: type === "map" ? mapId : undefined,
    title: previous?.title ?? carry?.title,
  };
}
