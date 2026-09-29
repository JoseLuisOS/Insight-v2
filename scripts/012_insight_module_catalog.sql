-- Catálogo de navegación de Insight. Ejecutar como insight_app.
begin;

create table insight_core.app_modules (
  code text primary key check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null check (length(trim(name)) between 2 and 60),
  description text,
  icon text,
  sort_order integer not null default 0 check (sort_order between 0 and 999),
  active boolean not null default true,
  visible boolean not null default true,
  state text not null default 'desarrollo' check (state in ('apagado','desarrollo','listo','disponible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not visible or active)
);

create table insight_core.app_submodules (
  code text primary key check (code ~ '^[a-z0-9_]{2,40}$'),
  module_code text not null references insight_core.app_modules(code),
  name text not null check (length(trim(name)) between 2 and 60),
  description text,
  icon text,
  sort_order integer not null default 0 check (sort_order between 0 and 999),
  active boolean not null default true,
  visible boolean not null default true,
  state text not null default 'desarrollo' check (state in ('apagado','desarrollo','listo','disponible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not visible or active)
);
create index app_submodules_order on insight_core.app_submodules(module_code, sort_order, name);

-- Una concesión explícita abre los elementos en estado listo por organización.
create table insight_core.app_submodule_entitlements (
  organization_id uuid not null references insight_core.core_organizations(id) on delete cascade,
  submodule_code text not null references insight_core.app_submodules(code) on delete cascade,
  enabled boolean not null default true,
  entitled boolean not null default false,
  primary key (organization_id, submodule_code)
);

create table insight_core.app_module_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  entity text not null check (entity in ('module','submodule')),
  entity_code text not null,
  action text not null check (action in ('create','update')),
  before_value jsonb,
  after_value jsonb not null,
  created_at timestamptz not null default now()
);
create index app_module_audit_created on insight_core.app_module_audit(created_at desc);

alter table insight_core.app_modules enable row level security;
alter table insight_core.app_submodules enable row level security;
alter table insight_core.app_submodule_entitlements enable row level security;
alter table insight_core.app_module_audit enable row level security;
revoke all on insight_core.app_modules, insight_core.app_submodules,
  insight_core.app_submodule_entitlements, insight_core.app_module_audit from anon, authenticated, public;

insert into insight_core.app_modules(code,name,icon,sort_order,state) values
 ('general','General','Home',0,'disponible'),
 ('datos','Datos','Database',10,'disponible'),
 ('visualizacion','Visualización','ChartNoAxesCombined',20,'disponible'),
 ('administracion','Administración','Shield',30,'disponible'),
 ('insight','Insight','Boxes',40,'desarrollo');
insert into insight_core.app_submodules(code,module_code,name,icon,sort_order,state) values
 ('inicio','general','Inicio','LayoutDashboard',0,'disponible'),
 ('fuentes','datos','Fuentes','Plug',0,'disponible'),
 ('datasets','datos','Datasets','Table2',10,'disponible'),
 ('sql_lab','datos','SQL Lab','TerminalSquare',20,'disponible'),
 ('metricas','datos','Métricas','Sigma',30,'disponible'),
 ('dashboards','visualizacion','Dashboards','PanelsTopLeft',0,'disponible'),
 ('graficas','visualizacion','Gráficas','BarChart3',10,'disponible'),
 ('mapas','visualizacion','Mapas','Map',20,'disponible'),
 ('temas','visualizacion','Temas','Palette',30,'disponible'),
 ('usuarios','administracion','Usuarios','UsersRound',0,'disponible'),
 ('modulos','insight','Módulos','Boxes',0,'desarrollo');

insert into insight_core.app_submodule_entitlements(organization_id,submodule_code)
select o.id, s.code from insight_core.core_organizations o
cross join insight_core.app_submodules s;

create function insight_core.provision_app_entitlements() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_TABLE_NAME = 'core_organizations' then
    insert into insight_core.app_submodule_entitlements(organization_id,submodule_code)
    select NEW.id, code from insight_core.app_submodules;
  else
    insert into insight_core.app_submodule_entitlements(organization_id,submodule_code)
    select id, NEW.code from insight_core.core_organizations;
  end if;
  return NEW;
end $$;
create trigger provision_app_entitlements_for_org
after insert on insight_core.core_organizations
for each row execute function insight_core.provision_app_entitlements();
create trigger provision_app_entitlements_for_submodule
after insert on insight_core.app_submodules
for each row execute function insight_core.provision_app_entitlements();

commit;
