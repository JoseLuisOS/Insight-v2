-- Ola 2: per-breakpoint dashboard layouts. Stores react-grid-layout's responsive
-- `layouts` object ({ lg, md, sm } arrays). Item membership stays in
-- dashboard_items; this refines placement per breakpoint for the internal view.
alter table public.dashboards add column if not exists layouts_json jsonb;
