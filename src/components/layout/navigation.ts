import {
  BookOpenText,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  Settings2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Contador del resumen que se muestra junto al enlace. */
  badge?: "projects" | "openTasks";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Espacio de trabajo",
    items: [
      {
        to: "/",
        label: "Dashboard",
        icon: LayoutDashboard,
        end: true,
      },
      {
        to: "/projects",
        label: "Proyectos",
        icon: FolderKanban,
        badge: "projects",
      },
      {
        to: "/templates",
        label: "Plantillas",
        icon: LayoutTemplate,
      },
      {
        to: "/knowledge",
        label: "Base de conocimiento",
        icon: BookOpenText,
      },
      {
        to: "/tasks",
        label: "Tareas",
        icon: ListChecks,
        badge: "openTasks",
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        to: "/settings",
        label: "Configuración",
        icon: Settings2,
      },
    ],
  },
];

export const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Proyectos",
  "/templates": "Plantillas",
  "/knowledge": "Base de conocimiento",
  "/tasks": "Tareas",
  "/settings": "Configuración",
};

export function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (/^\/projects\/[^/]+\/docs\//.test(pathname)) return "Documento";
  if (pathname.startsWith("/projects/")) return "Detalle del proyecto";
  if (pathname.startsWith("/templates/")) return "Editar plantilla";
  return "Process Hub";
}
