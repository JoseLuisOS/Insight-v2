import "server-only";
import { cache } from "react";
import type { ChartConfig } from "@/lib/charts";
import type { ChartV2Definition } from "@/lib/chart-v2";
import { chartActor, chartOrganizations, getCoreDataset, listCoreChartMaps, listCoreDatasets } from "@/lib/chart-v2-datasets";
import { analyzeSurveyChart, surveyChartContext } from "@/lib/insight-charts";
import { userCatalogAccess } from "@/lib/insight-catalog";
import { listSurveys } from "@/lib/insight-surveys";
import { logDuration } from "@/lib/server-log";
import { adaptDatasetConfig, adaptSurveyDefinition,
  type ChartSourceCatalog, type ChartSourceRef, type LoadedChartSource, type SourceCarry } from "@/lib/chart-studio";

/** Catálogo de fuentes accesibles (encuestas por estudio e instrumento, datasets y organizaciones de subida). */
export const listChartSourceCatalog = cache(async (): Promise<ChartSourceCatalog> => {
  const started = performance.now();
  const actor = await chartActor();
  const withSurveys = (await userCatalogAccess(actor.userId, actor.admin)).has("encuestas");
  const [organizations, datasets, surveyData] = await Promise.all([
    chartOrganizations(), listCoreDatasets(), withSurveys ? listSurveys() : Promise.resolve(null)]);
  const allowed = new Set(organizations.map((organization) => organization.id));
  const studies: ChartSourceCatalog["studies"] = [];
  const byStudy = new Map<string, ChartSourceCatalog["studies"][number]>();
  for (const survey of surveyData?.surveys ?? []) {
    if (!allowed.has(survey.organization_id)) continue;
    const versions = (surveyData?.versionsByInstrument[survey.id] ?? []).map((item) => ({ id: item.id, version: item.version }));
    if (!versions.length) continue;
    let study = byStudy.get(survey.study_id);
    if (!study) {
      study = { id: survey.study_id, name: survey.study_name, organizationName: survey.organization_name, instruments: [] };
      byStudy.set(survey.study_id, study);
      studies.push(study);
    }
    study.instruments.push({ id: survey.id, name: survey.name, versions });
  }
  await logDuration("charts.source_catalog", started, { studies: studies.length, datasets: datasets.length });
  return {
    studies,
    datasets: datasets.map((item) => ({ id: item.id, name: item.name, rowCount: item.row_count, organizationName: item.organization_name })),
    organizations,
  };
});

/** Carga una fuente con su configuración inicial: la guardada (`saved`) o la adaptada de `carry`. */
export async function loadChartSourceData(ref: ChartSourceRef, carry?: SourceCarry,
  saved?: { definition?: ChartV2Definition; config?: ChartConfig }): Promise<LoadedChartSource> {
  const started = performance.now();
  if (ref.kind === "survey") {
    const { detail, version, variables } = await surveyChartContext(ref.instrumentId, ref.versionId);
    const definition = saved?.definition ?? adaptSurveyDefinition(carry, variables, ref.instrumentId, version.id);
    const result = definition ? await analyzeSurveyChart(definition) : null;
    await logDuration("charts.source_load", started, { kind: "survey" });
    return { kind: "survey", instrumentId: ref.instrumentId, instrumentName: detail.survey.name, versionId: version.id,
      version: version.version, versions: detail.versions.map((item) => ({ id: item.id, version: item.version })),
      variables, definition, result };
  }
  const data = await getCoreDataset(ref.datasetId);
  const maps = await listCoreChartMaps(data.organization_id);
  const config = saved?.config ?? adaptDatasetConfig(carry, data.columns, maps.map((item) => item.id));
  await logDuration("charts.source_load", started, { kind: "dataset", rows: data.rows.length });
  return { kind: "dataset", datasetId: data.id, name: data.name, organizationId: data.organization_id, columns: data.columns,
    rows: data.rows, rowCount: data.row_count, maps: maps.map((item) => ({ id: item.id, name: item.name, name_property: item.name_property, geojson: item.geojson })),
    config };
}
