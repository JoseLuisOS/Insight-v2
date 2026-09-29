"use client";

import { useId, useRef, useState } from "react";
import type { PointerEvent, KeyboardEvent } from "react";
import type { State } from "@/lib/insight-catalog";

const POSITIONS: { state: State; label: string; angle: number; color: string; dark: string; hint: string }[] = [
  { state: "apagado", label: "Apagado", angle: -60, color: "#f87171", dark: "#b91c1c", hint: "Nadie puede acceder" },
  { state: "desarrollo", label: "Desarrollo", angle: 0, color: "#fbbf24", dark: "#b45309", hint: "Solo sysadmin" },
  { state: "disponible", label: "Disponible", angle: 60, color: "#34d399", dark: "#047857", hint: "Usuarios con acceso" },
];

const CENTER_X = 200;
const CENTER_Y = 195;
const RADIUS = 145;

function point(angle: number, radius: number) {
  const radians = angle * Math.PI / 180;
  return { x: CENTER_X + radius * Math.sin(radians), y: CENTER_Y - radius * Math.cos(radians) };
}

function arc(start: number, end: number) {
  const first = point(start, RADIUS);
  const last = point(end, RADIUS);
  return `M ${first.x} ${first.y} A ${RADIUS} ${RADIUS} 0 0 1 ${last.x} ${last.y}`;
}

function nearestState(angle: number): State {
  return POSITIONS.reduce((nearest, position) =>
    Math.abs(position.angle - angle) < Math.abs(nearest.angle - angle) ? position : nearest,
  ).state;
}

export function StateGauge({ value, onChange, label, disabled = false, compact = false }: {
  value: State;
  onChange: (state: State) => void;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const dragging = useRef(false);
  const [previewAngle, setPreviewAngle] = useState<number | null>(null);
  const activeState = previewAngle === null ? value : nearestState(previewAngle);
  const active = POSITIONS.find((position) => position.state === activeState)!;
  const angle = previewAngle ?? active.angle;

  function pointerAngle(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 400 / rect.width;
    const y = (event.clientY - rect.top) * 228 / rect.height;
    return Math.max(-84, Math.min(84, Math.atan2(x - CENTER_X, CENTER_Y - y) * 180 / Math.PI));
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (disabled) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPreviewAngle(pointerAngle(event));
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (dragging.current) setPreviewAngle(pointerAngle(event));
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    const next = nearestState(pointerAngle(event));
    setPreviewAngle(null);
    if (next !== value) onChange(next);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (disabled) return;
    const index = POSITIONS.findIndex((position) => position.state === value);
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.min(POSITIONS.length - 1, index + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.max(0, index - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = POSITIONS.length - 1;
    else if (/^[1-3]$/.test(event.key)) next = Number(event.key) - 1;
    else return;
    event.preventDefault();
    if (next !== index) onChange(POSITIONS[next].state);
  }

  return <div className={`relative isolate overflow-hidden rounded-2xl border bg-card px-3 pb-2 pt-2.5 text-center text-card-foreground shadow-inner transition-[border-color,box-shadow] duration-500 ${compact ? "w-[130px]" : "w-[155px]"} ${disabled ? "opacity-60" : ""}`}
    style={{ borderColor: `${active.color}80`, boxShadow: `0 0 24px -11px ${active.color}90, inset 0 0 25px -18px ${active.color}70` }}>
    <div className="pointer-events-none absolute inset-x-6 top-5 -z-10 h-24 rounded-full blur-2xl" style={{ backgroundColor: `${active.color}22` }} />
    <p className="mt-0.5 text-sm font-bold uppercase tracking-[.1em] transition-colors" style={{ color: active.color }} aria-live="polite">{active.label}</p>
    <svg viewBox="0 0 400 228" className={`mt-0.5 block w-full select-none outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-white/80 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      style={{ touchAction: "none" }} role="slider" tabIndex={disabled ? -1 : 0} aria-label={label} aria-valuemin={0} aria-valuemax={POSITIONS.length - 1}
      aria-valuenow={POSITIONS.findIndex((position) => position.state === value)} aria-valuetext={active.label} aria-disabled={disabled}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
      onPointerCancel={() => { dragging.current = false; setPreviewAngle(null); }} onKeyDown={handleKeyDown}>
      <defs>
        {POSITIONS.map((position) => <linearGradient id={`${id}-${position.state}`} key={position.state} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={position.color} /><stop offset="100%" stopColor={position.dark} />
        </linearGradient>)}
        <radialGradient id={`${id}-hub`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#64748b" /><stop offset="60%" stopColor="#1e293b" /><stop offset="100%" stopColor="#090d16" />
        </radialGradient>
      </defs>
      <path d={arc(-87, 87)} fill="none" stroke="#1e293b" strokeWidth="26" strokeLinecap="round" />
      <path d={arc(-87, 87)} fill="none" stroke="#0f172a" strokeWidth="21" strokeLinecap="round" />
      {POSITIONS.map((position, index) => <path key={position.state} d={arc(-84 + index * 59, -34 + index * 59)}
        fill="none" stroke={`url(#${id}-${position.state})`} strokeWidth="17" strokeLinecap="round"
        opacity={activeState === position.state ? 1 : .7} />)}
      {Array.from({ length: 18 }, (_, index) => {
        const tick = -85 + index * 10;
        const major = index % 3 === 0;
        const inner = point(tick, major ? 130 : 136);
        const outer = point(tick, 145);
        return <line key={tick} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={major ? "#94a3b8" : "#475569"} strokeWidth={major ? 2 : 1.2} />;
      })}
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${CENTER_X}px ${CENTER_Y}px` }} className={dragging.current ? "" : "motion-safe:transition-transform motion-safe:duration-500"}>
        <polygon points="197,195 200,52 203,195" fill="currentColor" />
        <polygon points="198.5,95 200,52 201.5,95" fill={active.color} />
        <polygon points="197,195 198,219 202,219 203,195" fill="#64748b" />
        <circle cx="200" cy="195" r="15" fill={`url(#${id}-hub)`} stroke="#334155" strokeWidth="2.5" />
        <circle cx="200" cy="195" r="5" fill="#f1f5f9" />
      </g>
    </svg>
    <div className="grid grid-cols-3 gap-0.5" aria-label="Posiciones del estado">
      {POSITIONS.map((position) => <button key={position.state} type="button" disabled={disabled}
        aria-label={`${label}: ${position.label}. ${position.hint}`} aria-pressed={value === position.state}
        title={position.hint} onClick={() => { if (position.state !== value) onChange(position.state); }}
        className={`rounded-md py-1 font-semibold tracking-tight text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed ${compact ? "text-[7px]" : "text-[8px]"}`}
        style={{ color: value === position.state ? position.color : undefined }}>
        {compact ? ({ apagado: "Apag.", desarrollo: "Desarr.", disponible: "Disp." } as const)[position.state] : position.label}
      </button>)}
    </div>
  </div>;
}
