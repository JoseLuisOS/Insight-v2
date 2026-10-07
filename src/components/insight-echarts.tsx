"use client";

import type { ComponentProps } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, BoxplotChart, LineChart, MapChart, PieChart, ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart, BoxplotChart, LineChart, MapChart, PieChart, ScatterChart,
  GridComponent, LegendComponent, TitleComponent, TooltipComponent, VisualMapComponent,
  CanvasRenderer,
]);

export function registerInsightMap(name: string, geojson: object) {
  echarts.registerMap(name, geojson as never);
}

export default function InsightECharts(props: Omit<ComponentProps<typeof ReactEChartsCore>, "echarts">) {
  return <ReactEChartsCore echarts={echarts} {...props} />;
}
