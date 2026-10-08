"use client";

import { useRef, type JSX, type KeyboardEvent } from "react";
import type { ChartType } from "@/lib/charts";

export type ChartTypeOption = {
  type: ChartType;
  label: string;
  disabledReason?: string | null;
};

const AXES = (
  <path
    d="M6 4v32h54"
    className="stroke-muted-foreground"
    fill="none"
    strokeWidth="1.5"
    strokeLinecap="round"
  />
);

// Miniaturas ilustrativas (no son datos reales).
const THUMBNAILS: Record<ChartType, JSX.Element> = {
  kpi: (
    <>
      <text
        x="32"
        y="22"
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        className="fill-primary"
      >
        42
      </text>
      <path
        d="M12 34l10-5 8 3 10-7 12-4"
        className="stroke-accent-teal"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  bar: (
    <>
      {AXES}
      <rect x="12" y="20" width="9" height="16" rx="1" className="fill-primary" />
      <rect x="25" y="8" width="9" height="28" rx="1" className="fill-accent-teal" />
      <rect x="38" y="15" width="9" height="21" rx="1" className="fill-primary" />
      <rect x="51" y="24" width="7" height="12" rx="1" className="fill-accent-teal" />
    </>
  ),
  line: (
    <>
      {AXES}
      <path
        d="M10 30l12-12 10 7 12-16 12 6"
        className="stroke-primary"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [10, 30],
        [22, 18],
        [32, 25],
        [44, 9],
        [56, 15],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="2.2" className="fill-accent-teal" />
      ))}
    </>
  ),
  area: (
    <>
      {AXES}
      <path
        d="M6 36V26l14-9 12 6 14-14 14 8v19z"
        className="fill-primary"
        fillOpacity="0.3"
      />
      <path
        d="M6 26l14-9 12 6 14-14 14 8"
        className="stroke-primary"
        fill="none"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </>
  ),
  pie: (
    <>
      <circle cx="32" cy="20" r="16" className="fill-primary" />
      <path d="M32 20V4a16 16 0 0 1 15.2 11z" className="fill-accent-teal" />
      <path d="M32 20l15.2-5A16 16 0 0 1 36 35.5z" className="fill-accent-violet" />
    </>
  ),
  table: (
    <>
      <rect x="8" y="5" width="48" height="30" rx="2" className="stroke-muted-foreground" fill="none" strokeWidth="1.5" />
      <rect x="8" y="5" width="48" height="8" rx="2" className="fill-primary" fillOpacity="0.6" />
      <path
        d="M8 21h48M8 28h48M28 13v22"
        className="stroke-muted-foreground"
        strokeWidth="1.2"
      />
    </>
  ),
  map: (
    <>
      <path d="M8 12l14-6 10 5-3 12-14 4z" className="fill-primary" fillOpacity="0.8" />
      <path d="M32 11l12-5 12 8-6 12-15 2-3-5z" className="fill-accent-teal" fillOpacity="0.8" />
      <path d="M15 27l14-4 3 5 15-2-5 11-18 2z" className="fill-accent-violet" fillOpacity="0.8" />
    </>
  ),
  scatter: (
    <>
      {AXES}
      {[
        [14, 29],
        [20, 24],
        [26, 26],
        [32, 17],
        [38, 20],
        [46, 11],
        [52, 14],
      ].map(([x, y], i) => (
        <circle
          key={x}
          cx={x}
          cy={y}
          r="2.4"
          className={i % 2 ? "fill-accent-teal" : "fill-primary"}
        />
      ))}
    </>
  ),
  histogram: (
    <>
      {AXES}
      <rect x="9" y="26" width="9" height="10" className="fill-primary" fillOpacity="0.7" />
      <rect x="18" y="16" width="9" height="20" className="fill-primary" />
      <rect x="27" y="6" width="9" height="30" className="fill-accent-teal" />
      <rect x="36" y="14" width="9" height="22" className="fill-primary" />
      <rect x="45" y="25" width="9" height="11" className="fill-primary" fillOpacity="0.7" />
    </>
  ),
  boxplot: (
    <>
      {AXES}
      <g className="stroke-muted-foreground" strokeWidth="1.5">
        <path d="M22 6v6M22 28v6M18 6h8M18 34h8" />
        <path d="M44 10v4M44 30v4M40 10h8M40 34h8" />
      </g>
      <rect x="15" y="12" width="14" height="16" className="fill-primary" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="37" y="14" width="14" height="16" className="fill-accent-violet" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 21h14M37 22h14" stroke="currentColor" strokeWidth="2" />
    </>
  ),
};

const COLOR_BY_TYPE: Record<ChartType, string> = {
  kpi: "text-primary",
  bar: "text-primary",
  line: "text-primary",
  area: "text-primary",
  pie: "text-primary",
  table: "text-primary",
  map: "text-primary",
  scatter: "text-primary",
  histogram: "text-primary",
  boxplot: "text-primary",
};

export function ChartTypePicker({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ChartTypeOption[];
  value: ChartType;
  onChange: (type: ChartType) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const isDisabled = (o: ChartTypeOption) => Boolean(disabled || o.disabledReason);

  function move(from: number, step: number) {
    const dir = step > 0 ? 1 : -1;
    let i = from + step;
    while (i >= 0 && i < options.length) {
      if (!isDisabled(options[i])) {
        refs.current[i]?.focus();
        onChange(options[i].type);
        return;
      }
      i += dir * (Math.abs(step) === 1 ? 1 : 3);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 3,
      ArrowUp: -3,
    };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    move(index, step);
  }

  const selectedIndex = options.findIndex((o) => o.type === value);
  const tabbableIndex =
    selectedIndex >= 0 && !isDisabled(options[selectedIndex])
      ? selectedIndex
      : options.findIndex((o) => !isDisabled(o));

  return (
    <div
      role="radiogroup"
      aria-label="Tipo de gráfica"
      className="grid grid-cols-3 gap-1.5"
    >
      {options.map((o, i) => {
        const off = isDisabled(o);
        const checked = o.type === value;
        return (
          <button
            key={o.type}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={off ? "true" : undefined}
            tabIndex={i === tabbableIndex ? 0 : -1}
            title={off ? (o.disabledReason ?? o.label) : o.label}
            onClick={() => {
              if (!off) onChange(o.type);
            }}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-md border p-1.5 transition-colors ${
              checked
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-foreground hover:bg-muted"
            } ${off ? "cursor-not-allowed opacity-50 hover:bg-transparent" : "cursor-pointer"}`}
          >
            <svg
              viewBox="0 0 64 40"
              aria-hidden="true"
              className={`h-14 w-full ${COLOR_BY_TYPE[o.type]}`}
            >
              {THUMBNAILS[o.type]}
            </svg>
            <span className="w-full truncate text-center text-[11px]">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
