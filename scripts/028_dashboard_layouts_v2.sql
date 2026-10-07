-- Editable chart layouts for organization dashboards. Run as insight_app.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
alter table insight_core.core_dashboard_items
  add column layout_json jsonb not null default '{"x":0,"y":0,"w":6,"h":5}'::jsonb,
  add constraint core_dashboard_items_layout_object check (jsonb_typeof(layout_json) = 'object');
commit;
