"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, FilterX, Search, X, type LucideIcon } from "lucide-react";

export type FilterOption = { value: string; label: string };

export function MultiCheckDropdown({
  label, icon: Icon, options, selected, onToggle, collapsed = false,
}: {
  label: string;
  icon: LucideIcon;
  options: FilterOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 8, left: Math.min(Math.max(8, rect.left), window.innerWidth - 232) });
  }
  useLayoutEffect(() => { if (open) place(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  return <>
    <button ref={buttonRef} type="button" onClick={() => setOpen((value) => !value)} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} aria-expanded={open}
      className={`flex h-10 shrink-0 items-center gap-2 rounded-xl border bg-background text-sm transition ${collapsed ? "px-2.5" : "px-3"} ${open ? "border-primary/40 text-primary" : "border-border text-foreground hover:border-primary/30"}`}>
      <Icon size={15} className="text-primary" />
      {!collapsed && <><span>{label}</span>{selected.size > 0 && <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-bold tabular-nums text-primary">{selected.size}</span>}<ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} /></>}
    </button>
    {open && position && createPortal(<div ref={panelRef} style={{ position: "fixed", top: position.top, left: position.left, width: 224 }} className="z-[80] max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl">
      {options.length === 0 ? <p className="px-2 py-2 text-xs text-muted-foreground">Sin opciones disponibles</p> : options.map((option) => <label key={option.value} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-card-foreground transition hover:bg-muted">
        <input type="checkbox" checked={selected.has(option.value)} onChange={() => onToggle(option.value)} className="size-4 accent-primary" />{option.label}
      </label>)}
    </div>, document.body)}
  </>;
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} title="Limpiar filtros" aria-label="Limpiar filtros" className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground transition hover:border-primary/30 hover:text-primary"><FilterX size={15} /></button>;
}

export function SearchInput({ value, onChange, isOpen, setIsOpen, placeholder = "Buscar permisos…" }: {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  placeholder?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const outside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node) && !value.trim()) setIsOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [isOpen, setIsOpen, value]);
  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);
  function toggle() {
    if (isOpen) { onChange(""); setIsOpen(false); }
    else setIsOpen(true);
  }
  return <div ref={containerRef} className="relative flex min-w-0 items-center gap-2">
    <div className={`relative flex min-w-0 items-center overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "w-56 opacity-100" : "pointer-events-none w-0 opacity-0"}`}>
      <Search size={14} className="pointer-events-none absolute left-3 text-muted-foreground" />
      <input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-8 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/10" />
      {value && <button type="button" title="Limpiar búsqueda" aria-label="Limpiar búsqueda" onClick={() => { onChange(""); inputRef.current?.focus(); }} className="absolute right-2.5 rounded-md p-0.5 text-muted-foreground transition hover:text-foreground"><X size={14} /></button>}
    </div>
    <button type="button" onClick={toggle} title="Buscar" aria-label="Buscar" aria-expanded={isOpen} className={`grid size-10 shrink-0 place-items-center rounded-xl border transition ${isOpen ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-primary"}`}><Search size={15} /></button>
  </div>;
}

export function useDelayedCollapse(isOpen: boolean, delayMs = 300) {
  const [collapsed, setCollapsed] = useState(isOpen);
  useEffect(() => {
    if (isOpen) setCollapsed(true);
    else {
      const timer = setTimeout(() => setCollapsed(false), delayMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, delayMs]);
  return collapsed;
}
