"use client";

import { CHART_V2_CATALOG, type ChartV2Definition, type ChartV2Variable } from "@/lib/chart-v2";
import { PRESET_PALETTES } from "@/lib/charts";

const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

/** Controles de campos de una gráfica de encuesta (sin nombre, fuente ni tipo). */
export function SurveyChartFields({ definition, variables, onChange, disabled }: {
  definition: ChartV2Definition;
  variables: ChartV2Variable[];
  onChange: (patch: Partial<ChartV2Definition>) => void;
  disabled?: boolean;
}) {
  const set = onChange;
  const setStyle = (patch: Partial<ChartV2Definition["style"]>) =>
    set({ style: { ...definition.style, ...patch } });
  const chosenType = CHART_V2_CATALOG.find((item) => item.type === definition.type)!;
  const numericVariables = variables.filter((item) => item.numeric);
  const xChoices = chosenType.numericX ? numericVariables : variables;
  const selectedFilter = variables.find((item) => item.id === definition.filter?.variableId);
  const extraFilters = definition.filters ?? [];
  const updateExtraFilter = (index: number, variableId: string, value: string) =>
    set({ filters: extraFilters.map((filter, position) => position === index ? { variableId, value } : filter) });
  const needsY = definition.type === "scatter" || ["sum","avg","median","min","max"].includes(definition.metric) && !["histogram","boxplot"].includes(definition.type);

  return <fieldset disabled={disabled} className="min-w-0 space-y-4 border-0 p-0">
    <div><label className={labelClass} htmlFor="chart-x">{chosenType.numericX ? "Variable numérica" : "Dimensión / eje X"}</label>
      <select id="chart-x" className={inputClass} value={definition.xVariableId} onChange={(event) => set({ xVariableId: event.target.value })}>
        {xChoices.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.question}</option>)}
      </select></div>
    {needsY && <div><label className={labelClass} htmlFor="chart-y">{definition.type === "scatter" ? "Variable numérica Y" : "Medida numérica"}</label>
      <select id="chart-y" className={inputClass} value={definition.yVariableId ?? ""} onChange={(event) => set({ yVariableId: event.target.value || undefined })}>
        <option value="">Selecciona una variable</option>{numericVariables.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.question}</option>)}
      </select></div>}
    {(definition.type === "bar" || definition.type === "line" || definition.type === "area" || definition.type === "table" || definition.type === "scatter" || definition.type === "boxplot") &&
      <div><label className={labelClass} htmlFor="chart-group">Cruce / grupo</label>
        <select id="chart-group" className={inputClass} value={definition.groupVariableId ?? ""} onChange={(event) => set({ groupVariableId: event.target.value || undefined })}>
          <option value="">Sin grupo</option>{variables.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.question}</option>)}
        </select></div>}
    {!["scatter","boxplot"].includes(definition.type) && <div><label className={labelClass} htmlFor="chart-metric">Cálculo</label>
      <select id="chart-metric" className={inputClass} value={definition.metric} onChange={(event) => set({ metric: event.target.value as ChartV2Definition["metric"] })}>
        {(definition.type === "histogram" ? ["count","percent"] : ["count","percent","sum","avg","median","min","max"]).map((item) =>
          <option key={item} value={item}>{({ count: "Conteo", percent: "Porcentaje", sum: "Suma", avg: "Promedio", median: "Mediana", min: "Mínimo", max: "Máximo" } as Record<string,string>)[item]}</option>)}
      </select></div>}
    {definition.type === "histogram" && <div><label className={labelClass} htmlFor="chart-bins">Intervalos: {definition.bins}</label><input id="chart-bins" className="w-full" type="range" min={2} max={50} value={definition.bins} onChange={(event) => set({ bins: Number(event.target.value) })} /></div>}
    <details className="rounded-md border border-border p-3" open><summary className="cursor-pointer text-sm font-medium">Población y filtros</summary><div className="mt-3 space-y-3">
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={definition.includeMissing} onChange={(event) => set({ includeMissing: event.target.checked })} />Incluir ausentes y sin respuesta</label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={definition.includeWarnings} onChange={(event) => set({ includeWarnings: event.target.checked })} />Incluir respuestas con advertencia</label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={definition.includeInvalidObservations} onChange={(event) => set({ includeInvalidObservations: event.target.checked })} />Incluir observaciones parciales o inválidas</label>
      <div><label className={labelClass} htmlFor="chart-filter">Filtrar por variable</label><select id="chart-filter" className={inputClass} value={definition.filter?.variableId ?? ""} onChange={(event) => set({ filter: event.target.value ? { variableId: event.target.value, value: "" } : undefined })}>
        <option value="">Sin filtro</option>{variables.filter((item) => !extraFilters.some((filter) => filter.variableId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.question}</option>)}
      </select></div>
      {definition.filter && <div><label className={labelClass} htmlFor="chart-filter-value">Valor del filtro</label>
        {selectedFilter?.options.length ? <select id="chart-filter-value" className={inputClass} value={definition.filter.value} onChange={(event) => set({ filter: { ...definition.filter!, value: event.target.value } })}>
          <option value="">Selecciona un valor</option>{selectedFilter.options.map((item) => <option key={item} value={item}>{item}</option>)}
        </select> : <input id="chart-filter-value" className={inputClass} value={definition.filter.value} onChange={(event) => set({ filter: { ...definition.filter!, value: event.target.value } })} placeholder="Valor exacto" />}</div>}
      {extraFilters.map((filter, index) => {
        const variable = variables.find((item) => item.id === filter.variableId);
        return <div key={index} className="space-y-2 rounded-md border border-border p-2">
          <div className="flex items-center justify-between"><span className="text-xs font-medium">Filtro {index + 2}</span>
            <button type="button" onClick={() => set({ filters: extraFilters.filter((_, position) => position !== index) })}
              className="text-xs text-danger hover:underline">Quitar</button></div>
          <label className={labelClass} htmlFor={`chart-extra-filter-${index}`}>Pregunta</label>
          <select id={`chart-extra-filter-${index}`} className={inputClass} value={filter.variableId}
            onChange={(event) => updateExtraFilter(index, event.target.value, "")}>
            <option value="">Selecciona una pregunta</option>{variables.filter((item) => item.id === filter.variableId ||
              item.id !== definition.filter?.variableId && !extraFilters.some((other, position) => position !== index && other.variableId === item.id))
              .map((item) => <option key={item.id} value={item.id}>{item.code} · {item.question}</option>)}
          </select>
          {filter.variableId && <><label className={labelClass} htmlFor={`chart-extra-value-${index}`}>Respuesta</label>
            {variable?.options.length ? <select id={`chart-extra-value-${index}`} className={inputClass} value={filter.value}
              onChange={(event) => updateExtraFilter(index, filter.variableId, event.target.value)}>
              <option value="">Selecciona un valor</option>{variable.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select> : <input id={`chart-extra-value-${index}`} className={inputClass} value={filter.value}
              onChange={(event) => updateExtraFilter(index, filter.variableId, event.target.value)} placeholder="Valor exacto" />}</>}
        </div>;
      })}
      {definition.filter?.value && extraFilters.length < 3 && <button type="button"
        onClick={() => set({ filters: [...extraFilters, { variableId: "", value: "" }] })}
        className="text-xs text-primary hover:underline">Añadir otro filtro</button>}
    </div></details>
    <details className="rounded-md border border-border p-3" open><summary className="cursor-pointer text-sm font-medium">Cálculo estadístico</summary><div className="mt-3 space-y-3">
      <div><label className={labelClass} htmlFor="chart-weight">Ponderación</label><select id="chart-weight" className={inputClass} value={definition.weightMode} onChange={(event) => set({ weightMode: event.target.value as ChartV2Definition["weightMode"] })}>
        <option value="unweighted">Sin ponderar</option><option value="weighted">Ponderado</option></select></div>
      {definition.metric === "percent" && <div><label className={labelClass} htmlFor="chart-base">Base porcentual</label><select id="chart-base" className={inputClass} value={definition.percentageBase} onChange={(event) => set({ percentageBase: event.target.value as ChartV2Definition["percentageBase"] })}>
        <option value="observations">Personas / observaciones</option><option value="selections">Selecciones</option></select></div>}
    </div></details>
    <details className="rounded-md border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Presentación</summary><div className="mt-3 space-y-3">
      <div><label className={labelClass} htmlFor="chart-title">Título</label><input id="chart-title" className={inputClass} value={definition.style.title ?? ""} onChange={(event) => setStyle({ title: event.target.value })} /></div>
      <div><label className={labelClass} htmlFor="chart-x-label">Etiqueta X</label><input id="chart-x-label" className={inputClass} value={definition.style.xLabel ?? ""} onChange={(event) => setStyle({ xLabel: event.target.value })} /></div>
      <div><label className={labelClass} htmlFor="chart-y-label">Etiqueta Y</label><input id="chart-y-label" className={inputClass} value={definition.style.yLabel ?? ""} onChange={(event) => setStyle({ yLabel: event.target.value })} /></div>
      <div><label className={labelClass} htmlFor="chart-palette">Paleta</label><select id="chart-palette" className={inputClass} onChange={(event) => setStyle({ palette: PRESET_PALETTES[event.target.value] })}>
        {Object.keys(PRESET_PALETTES).map((item) => <option key={item} value={item}>{item}</option>)}
      </select></div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!definition.style.showLegend} onChange={(event) => setStyle({ showLegend: event.target.checked })} />Mostrar leyenda</label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!definition.style.showLabels} onChange={(event) => setStyle({ showLabels: event.target.checked })} />Mostrar valores</label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!definition.style.stacked} onChange={(event) => setStyle({ stacked: event.target.checked })} />Apilar series</label>
    </div></details>
  </fieldset>;
}
