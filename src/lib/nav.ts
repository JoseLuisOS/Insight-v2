// Navigation definition for the app shell. Icons are lucide names resolved by
// components/navigation/nav-icon.tsx (kept as strings so the structure can
// cross the server → client boundary).

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  code?: string;
}

export interface NavGroup {
  label: string;
  icon?: string;
  code?: string;
  items: NavItem[];
  /** Whether the group can be collapsed in the expanded sidebar (default true). */
  collapsible?: boolean;
}

export const NAV: NavGroup[] = [
  {
    label: "General",
    code: "general",
    icon: "Home",
    collapsible: false,
    items: [{ label: "Inicio", href: "/dashboard", icon: "LayoutDashboard", code: "inicio" }],
  },
  {
    label: "Datos",
    code: "datos",
    icon: "Database",
    items: [
      { label: "Fuentes", href: "/sources", icon: "Plug", code: "fuentes" },
      { label: "Datasets", href: "/datasets", icon: "Table2", code: "datasets" },
      { label: "SQL Lab", href: "/sql", icon: "TerminalSquare", code: "sql_lab" },
      { label: "Métricas", href: "/metrics", icon: "Sigma", code: "metricas" },
    ],
  },
  {
    label: "Encuestas",
    code: "encuestas",
    icon: "ClipboardList",
    items: [{ label: "Encuestas", href: "/surveys", icon: "ClipboardList", code: "encuestas" }],
  },
  {
    label: "Visualización",
    code: "visualizacion",
    icon: "ChartNoAxesCombined",
    items: [
      { label: "Dashboards", href: "/dashboards", icon: "PanelsTopLeft", code: "dashboards" },
      { label: "Gráficas", href: "/charts", icon: "BarChart3", code: "graficas" },
      { label: "Mapas", href: "/maps", icon: "Map", code: "mapas" },
      { label: "Temas", href: "/themes", icon: "Palette", code: "temas" },
    ],
  },
  {
    label: "Administración",
    code: "administracion",
    icon: "Shield",
    items: [
      { label: "Usuarios", href: "/team", icon: "UsersRound", code: "usuarios" },
      { label: "Roles", href: "/roles", icon: "UserCog", code: "insight_roles" },
      { label: "Permisos", href: "/permissions", icon: "KeyRound", code: "insight_permissions" },
    ],
  },
  {
    label: "Insight",
    code: "insight",
    icon: "Boxes",
    items: [
      { label: "Componentes", href: "/insight/modules", icon: "Boxes", code: "insight_catalog" },
      { label: "Organizaciones", href: "/insight/organizations", icon: "Building2", code: "insight_organizations" },
    ],
  },
];

/** Routes that live outside the menu but still deserve a header title. */
const EXTRA_ROUTES: { group: string; item: NavItem }[] = [
  { group: "Cuenta", item: { label: "Perfil", href: "/profile", icon: "CircleUserRound" } },
  { group: "Datos", item: { label: "Consulta", href: "/query", icon: "Table2" } },
];

const matches = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

/**
 * Resolves the group/item for a pathname (prefix match). `siblings` are the
 * group's items for the header's quick-access strip — empty for extra routes.
 */
export function findActiveNav(
  nav: NavGroup[],
  pathname: string,
): { group: NavGroup | null; active: NavItem | null } {
  for (const group of nav) {
    const active = group.items.find((it) => matches(pathname, it.href));
    if (active) return { group, active };
  }
  for (const extra of EXTRA_ROUTES) {
    if (matches(pathname, extra.item.href)) {
      return {
        group: { label: extra.group, items: [extra.item], collapsible: false },
        active: extra.item,
      };
    }
  }
  return { group: null, active: null };
}

const SUBMODULE_ROUTES: { pattern: RegExp; title: string }[] = [
  { pattern: /^\/surveys\/?$/, title: "Estudios" },
  { pattern: /^\/surveys\/imports\/?$/, title: "Importar cuestionario" },
  { pattern: /^\/surveys\/[^/]+\/responses\/?$/, title: "Respuestas" },
  { pattern: /^\/surveys\/[^/]+\/?$/, title: "Cuestionario" },
  { pattern: /^\/datasets\/new\/?$/, title: "Nuevo dataset" },
  { pattern: /^\/datasets\/[^/]+\/?$/, title: "Detalle de dataset" },
  { pattern: /^\/charts\/new\/?$/, title: "Nueva gráfica" },
  { pattern: /^\/charts\/[^/]+\/edit\/?$/, title: "Editar gráfica" },
  { pattern: /^\/charts\/[^/]+\/?$/, title: "Detalle de gráfica" },
  { pattern: /^\/dashboards\/[^/]+\/edit\/?$/, title: "Editar dashboard" },
  { pattern: /^\/dashboards\/[^/]+\/?$/, title: "Detalle de dashboard" },
  { pattern: /^\/query\/new\/?$/, title: "Nueva consulta" },
];

export function getDocumentTitle(nav: NavGroup[], pathname: string, view?: string | null): string {
  const { active } = findActiveNav(nav, pathname);
  if (!active) return "Intersel Insight";
  const surveyViewTitle = /^\/surveys\/[^/]+\/?$/.test(pathname)
    ? view === "table" ? "Tabla de registros" : view === "records" ? "Registros" : null
    : null;
  const submodule = surveyViewTitle ?? SUBMODULE_ROUTES.find(({ pattern }) => pattern.test(pathname))?.title;
  return [active.label, submodule, "Intersel Insight"].filter(Boolean).join(" · ");
}
