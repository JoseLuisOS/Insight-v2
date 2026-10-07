import "server-only";
import { notFound } from "next/navigation";
import { insightDb } from "@/lib/insight-db";
import { canViewSurveyResource } from "@/lib/insight-surveys";
import type { ChartV2Definition, ChartV2Metric, ChartV2Result, ChartV2Variable } from "@/lib/chart-v2";
import { CHART_V2_CATALOG } from "@/lib/chart-v2";
import { chartActor, chartOrganizations } from "@/lib/chart-v2-datasets";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Answer = { labels: string[]; numeric: number | null; missing: boolean; warning: boolean };
type Observation = { id: string; status: string; weight: number; answers: Map<string, Answer> };
type Raw = {
  observation_id: string; status: string; weight: string | number | null;
  variable_id: string | null; label: string | null; numeric_value: string | number | null;
  is_missing: boolean | null; option_missing: boolean | null;
  quality_status: string | null; selection_labels: string[] | null;
};

export async function surveyChartContext(instrumentId: string, versionId?: string) {
  if (!UUID.test(instrumentId) || (versionId && !UUID.test(versionId))) notFound();
  const actor = await chartActor();
  const source = await insightDb().query(`select i.id, i.name, i.organization_id
    from insight_survey.survey_instruments i
    join insight_core.core_organizations o on o.id = i.organization_id and o.status = 'active'
    where i.id = $1 and not exists (
      select 1 from insight_survey.survey_import_jobs j
      where j.id::text = i.metadata->>'import_job_id' and j.status <> 'completed')`, [instrumentId]);
  const survey = source.rows[0] as { id: string; name: string; organization_id: string } | undefined;
  if (!survey || !(await chartOrganizations()).some((organization) => organization.id === survey.organization_id)) notFound();
  if (!actor.admin) {
    const [access, view, resource] = await Promise.all([
      actor.supabase.rpc("iam_has_permission", { p_org: survey.organization_id, p_code: "survey.access" }),
      actor.supabase.rpc("iam_has_permission", { p_org: survey.organization_id, p_code: "survey.view" }),
      canViewSurveyResource(actor, survey.organization_id, instrumentId),
    ]);
    if (access.error || access.data !== true || view.error || view.data !== true || !resource) notFound();
  }
  const versionRows = await insightDb().query(`select id, version, name, status
    from insight_survey.survey_instrument_versions
    where instrument_id = $1 and organization_id = $2
    order by created_at desc, id desc`, [instrumentId, survey.organization_id]);
  const versions = versionRows.rows as { id: string; version: string; name: string | null; status: string }[];
  const version = versionId ? versions.find((candidate) => candidate.id === versionId) : versions[0];
  if (!version) notFound();
  const detail = { survey: { ...survey, version: version.version }, versions };
  const query = await insightDb().query(`select v.id, v.code, v.label, v.data_type as "dataType", q.text as question,
      (lower(v.data_type) in ('integer','decimal','number','numeric','float','double','real')
        or v.measurement_level in ('interval','ratio')) as numeric,
      coalesce((select array_agg(ao.label order by ao.position, ao.code)
        from insight_survey.survey_answer_options ao
        where ao.question_id = q.id and ao.organization_id = q.organization_id), '{}'::text[]) as options
    from insight_survey.survey_variables v
    join insight_survey.survey_questions q on q.id = v.question_id and q.organization_id = v.organization_id
    where q.instrument_version_id = $1 and q.organization_id = $2 and v.is_analysis_variable
    order by q.position, v.code`, [version.id, detail.survey.organization_id]);
  return { detail, version, variables: query.rows as ChartV2Variable[] };
}

function quantile(values: { value: number; weight: number }[], fraction: number, weighted: boolean): number {
  const sorted = values.filter((x) => x.weight > 0).sort((a, b) => a.value - b.value);
  if (!sorted.length) return 0;
  if (!weighted) {
    const index = (sorted.length - 1) * fraction;
    const low = Math.floor(index);
    return sorted[low].value + (sorted[Math.min(low + 1, sorted.length - 1)].value - sorted[low].value) * (index - low);
  }
  const total = sorted.reduce((sum, x) => sum + x.weight, 0);
  let cumulative = 0;
  for (const entry of sorted) {
    cumulative += entry.weight;
    if (cumulative >= total * fraction) return entry.value;
  }
  return sorted[sorted.length - 1].value;
}

function statistic(values: { value: number; weight: number }[], metric: ChartV2Metric, weighted: boolean): number {
  if (!values.length) return 0;
  const mass = values.reduce((sum, x) => sum + x.weight, 0);
  switch (metric) {
    case "sum": return values.reduce((sum, x) => sum + x.value * x.weight, 0);
    case "avg": return mass ? values.reduce((sum, x) => sum + x.value * x.weight, 0) / mass : 0;
    case "median": return quantile(values, 0.5, weighted);
    case "min": return values.reduce((min, x) => Math.min(min, x.value), Infinity);
    case "max": return values.reduce((max, x) => Math.max(max, x.value), -Infinity);
    default: return mass;
  }
}

export async function analyzeSurveyChart(
  definition: ChartV2Definition,
  dashboardFilter?: { variableId: string; value: string },
): Promise<ChartV2Result> {
  if (definition?.version !== 2 || definition.source?.kind !== "survey" ||
      !CHART_V2_CATALOG.some((item) => item.type === definition.type) ||
      !["count","percent","sum","avg","median","min","max"].includes(definition.metric) ||
      !["weighted","unweighted"].includes(definition.weightMode) ||
      !["observations","selections"].includes(definition.percentageBase) ||
      !Number.isInteger(definition.bins) || definition.bins < 2 || definition.bins > 100) {
    throw new Error("Configuración de gráfica no válida.");
  }
  const { detail, version, variables } = await surveyChartContext(definition.source.instrumentId, definition.source.versionId);
  const ids = [definition.xVariableId, definition.yVariableId, definition.groupVariableId,
    definition.filter?.variableId, ...(definition.filters ?? []).map((filter) => filter.variableId),
    dashboardFilter?.variableId]
    .filter((id): id is string => !!id);
  if (!ids.length || ids.some((id) => !UUID.test(id) || !variables.some((variable) => variable.id === id))) {
    throw new Error("La gráfica contiene variables ajenas a la versión seleccionada.");
  }
  const xVariable = variables.find((v) => v.id === definition.xVariableId)!;
  const yVariable = variables.find((v) => v.id === definition.yVariableId);
  const type = definition.type;
  if ((type === "scatter" && (!xVariable.numeric || !yVariable?.numeric)) ||
      ((type === "histogram" || type === "boxplot") && !xVariable.numeric) ||
      (["sum","avg","median","min","max"].includes(definition.metric) &&
        type !== "histogram" && type !== "boxplot" && type !== "scatter" && !yVariable?.numeric)) {
    throw new Error("Selecciona variables numéricas para este análisis.");
  }
  const result = await insightDb().query(`select o.id as observation_id, o.status, o.weight,
      r.variable_id, coalesce(ao.label, r.value_text, r.raw_value) as label,
      coalesce(r.value_decimal, r.value_integer)::text as numeric_value,
      r.is_missing, ao.is_missing as option_missing, r.quality_status,
      coalesce(sel.labels, '{}'::text[]) as selection_labels
    from insight_survey.survey_observations o
    left join insight_survey.survey_responses r
      on r.observation_id = o.id and r.organization_id = o.organization_id
      and r.variable_id = any($3::uuid[])
    left join insight_survey.survey_answer_options ao
      on ao.id = r.answer_option_id and ao.organization_id = o.organization_id
    left join lateral (
      select array_agg(
        coalesce(opt.label, opt.value, opt.code) || case when opt.is_missing then ' (ausente)' else '' end
        order by opt.position, opt.code) as labels
      from insight_survey.survey_response_selections s
      join insight_survey.survey_answer_options opt
        on opt.id = s.answer_option_id and opt.organization_id = s.organization_id
      where s.response_id = r.id and s.organization_id = o.organization_id
    ) sel on true
    where o.instrument_version_id = $1 and o.organization_id = $2
    order by o.id`, [version.id, detail.survey.organization_id, [...new Set(ids)]]);

  const observations = new Map<string, Observation>();
  for (const row of result.rows as Raw[]) {
    let observation = observations.get(row.observation_id);
    if (!observation) {
      observation = { id: row.observation_id, status: row.status, weight: Number(row.weight ?? 1), answers: new Map() };
      observations.set(row.observation_id, observation);
    }
    if (!row.variable_id) continue;
    const missing = !!row.is_missing || !!row.option_missing || (!row.label && !row.selection_labels?.length && row.numeric_value == null);
    const warning = row.quality_status === "warning" || row.quality_status === "invalid";
    let labels = row.selection_labels?.length ? row.selection_labels : [row.label ?? (missing ? "Sin respuesta" : "Sin valor")];
    if (missing) labels = labels.map((label) => label === "Sin respuesta" || label.endsWith(" (ausente)") ? label : `${label} (ausente)`);
    if (warning) labels = labels.map((label) => `${label} (${row.quality_status === "invalid" ? "inválida" : "advertencia"})`);
    const numeric = row.numeric_value == null ? null : Number(row.numeric_value);
    observation.answers.set(row.variable_id, {
      labels: [...new Set(labels)], numeric: Number.isFinite(numeric) ? numeric : null,
      missing, warning,
    });
  }
  const weighted = definition.weightMode === "weighted";
  const answer = (observation: Observation, id: string): Answer =>
    observation.answers.get(id) ?? { labels: ["Sin respuesta"], numeric: null, missing: true, warning: false };
  const labels = (observation: Observation, id: string): string[] => {
    const value = answer(observation, id);
    if ((value.missing && !definition.includeMissing) || (value.warning && !definition.includeWarnings)) return [];
    return definition.includeMissing ? value.labels : value.labels.filter((label) => !label.includes(" (ausente)"));
  };
  const eligible = [...observations.values()].filter((observation) => {
    if (!definition.includeInvalidObservations && observation.status !== "completed") return false;
    for (const filter of [definition.filter, ...(definition.filters ?? []), dashboardFilter]) {
      if (filter && !labels(observation, filter.variableId).some((label) =>
        label === filter.value || label.startsWith(`${filter.value} (`))) return false;
    }
    return true;
  });
  const mass = (observation: Observation) => weighted ? observation.weight : 1;
  const base = eligible.reduce((sum, observation) => sum + mass(observation), 0);
  const noteParts = [weighted ? "Ponderado" : "Sin ponderar", `${eligible.length} observaciones`];
  for (const filter of [definition.filter, ...(definition.filters ?? []), dashboardFilter]) {
    if (filter) noteParts.push(`${variables.find((variable) => variable.id === filter.variableId)?.code ?? "Filtro"}: ${filter.value}`);
  }

  if (type === "kpi") {
    const answered = eligible.filter((observation) => labels(observation, definition.xVariableId).length);
    const answeredMass = answered.reduce((sum, observation) => sum + mass(observation), 0);
    const values = definition.yVariableId ? answered.flatMap((observation) => {
      const item = answer(observation, definition.yVariableId!);
      return labels(observation, definition.yVariableId!).length && item.numeric != null
        ? [{ value: item.numeric, weight: mass(observation) }] : [];
    }) : [];
    const value = definition.metric === "percent" ? (base ? 100 * answeredMass / base : 0)
      : definition.metric === "count" ? answeredMass : statistic(values, definition.metric, weighted);
    return { points: [{ label: "Total", value }], observationCount: eligible.length, base,
      shownCount: answered.length, note: `${noteParts.join(" · ")}. Base ${base}; ${answered.length} registros con valor.` };
  }

  if (type === "scatter") {
    const pairs = eligible.flatMap((observation) => {
      const x = answer(observation, definition.xVariableId);
      const y = answer(observation, definition.yVariableId!);
      if (!labels(observation, definition.xVariableId).length || !labels(observation, definition.yVariableId!).length || x.numeric == null || y.numeric == null) return [];
      return [{ x: x.numeric, y: y.numeric, weight: mass(observation),
        group: definition.groupVariableId ? labels(observation, definition.groupVariableId)[0] : undefined }];
    });
    const points = pairs.slice(0, 10000);
    return { points, observationCount: eligible.length, base, shownCount: points.length,
      note: `${noteParts.join(" · ")}. ${pairs.length > points.length ? `Se muestran ${points.length} de ${pairs.length} pares válidos.` : `${pairs.length} pares válidos.`}${weighted ? " El tamaño del punto representa el peso." : ""}` };
  }

  if (type === "histogram") {
    const values = eligible.flatMap((observation) => {
      const a = answer(observation, definition.xVariableId);
      return labels(observation, definition.xVariableId).length && a.numeric != null ? [{ value: a.numeric, weight: mass(observation) }] : [];
    });
    if (!values.length) return { points: [], observationCount: eligible.length, base, shownCount: 0, note: noteParts.join(" · ") };
    const min = values.reduce((current, item) => Math.min(current, item.value), Infinity);
    const max = values.reduce((current, item) => Math.max(current, item.value), -Infinity);
    const width = max === min ? 1 : (max - min) / definition.bins;
    const bins = Array.from({ length: max === min ? 1 : definition.bins }, (_, index) => ({
      label: `${(min + index * width).toLocaleString("es-MX", { maximumFractionDigits: 2 })}–${(min + (index + 1) * width).toLocaleString("es-MX", { maximumFractionDigits: 2 })}`,
      value: 0,
    }));
    for (const value of values) bins[Math.min(bins.length - 1, Math.floor((value.value - min) / width))].value += value.weight;
    const denominator = values.reduce((sum, value) => sum + value.weight, 0);
    if (definition.metric === "percent") for (const bin of bins) bin.value = denominator ? 100 * bin.value / denominator : 0;
    return { points: bins, observationCount: eligible.length, base: denominator, shownCount: values.length,
      note: `${noteParts.join(" · ")}. ${bins.length} intervalos; base de valores válidos: ${denominator}.` };
  }

  if (type === "boxplot") {
    const groups = new Map<string, { value: number; weight: number }[]>();
    for (const observation of eligible) {
      const a = answer(observation, definition.xVariableId);
      if (!labels(observation, definition.xVariableId).length || a.numeric == null || mass(observation) <= 0) continue;
      const groupLabels = definition.groupVariableId ? labels(observation, definition.groupVariableId) : ["Total"];
      for (const group of groupLabels) {
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group)!.push({ value: a.numeric, weight: mass(observation) });
      }
    }
    const points = [...groups].map(([label, values]) => {
      const q1 = quantile(values, 0.25, weighted);
      const median = quantile(values, 0.5, weighted);
      const q3 = quantile(values, 0.75, weighted);
      const low = q1 - 1.5 * (q3 - q1);
      const high = q3 + 1.5 * (q3 - q1);
      const inside = values.filter((item) => item.value >= low && item.value <= high).map((item) => item.value);
      return { label, min: inside.reduce((min, value) => Math.min(min, value), Infinity), q1, median, q3,
        max: inside.reduce((max, value) => Math.max(max, value), -Infinity),
        outliers: values.filter((item) => item.value < low || item.value > high).map((item) => item.value).slice(0, 1000) };
    });
    return { points, observationCount: eligible.length, base, shownCount: points.length,
      note: `${noteParts.join(" · ")}. Cuantiles ${weighted ? "por acumulación de pesos" : "con interpolación lineal"}; bigotes hasta 1.5 × IQR.` };
  }

  const groups = new Map<string, { label: string; group?: string; count: number; values: { value: number; weight: number }[] }>();
  for (const observation of eligible) {
    const xLabels = labels(observation, definition.xVariableId);
    const series = definition.groupVariableId ? labels(observation, definition.groupVariableId) : [undefined];
    const numeric = definition.yVariableId ? answer(observation, definition.yVariableId).numeric : null;
    for (const label of xLabels) for (const group of series) {
      const key = JSON.stringify([label, group]);
      let item = groups.get(key);
      if (!item) { item = { label, group, count: 0, values: [] }; groups.set(key, item); }
      item.count += mass(observation);
      if (numeric != null && (!definition.yVariableId || labels(observation, definition.yVariableId).length))
        item.values.push({ value: numeric, weight: mass(observation) });
    }
  }
  const plotted = eligible.filter((observation) => labels(observation, definition.xVariableId).length &&
    (!definition.groupVariableId || labels(observation, definition.groupVariableId).length));
  const observationBase = plotted.reduce((sum, observation) => sum + mass(observation), 0);
  const selectionBase = plotted.reduce((sum, observation) => sum + labels(observation, definition.xVariableId).length * mass(observation), 0);
  const denominator = definition.percentageBase === "selections" ? selectionBase : observationBase;
  const points = [...groups.values()].map((group) => ({
    label: group.label, group: group.group,
    value: definition.metric === "percent" ? (denominator ? 100 * group.count / denominator : 0)
      : ["count"].includes(definition.metric) ? group.count : statistic(group.values, definition.metric, weighted),
  }));
  points.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return { points, observationCount: eligible.length, base: definition.metric === "percent" ? denominator : observationBase,
    shownCount: points.length,
    note: `${noteParts.join(" · ")}. ${definition.metric === "percent" ? `Porcentaje de ${definition.percentageBase === "selections" ? "selecciones" : "observaciones"}; denominador ${denominator}.` : `Base ${observationBase}.`}` };
}
