import type { ChipProps } from "@heroui/react";
import type {
  DocumentStatus,
  KanbanStatus,
  ProjectPhase,
  ProjectStatus,
} from "@/types";

export { PROJECT_PHASES, PROJECT_STATUSES } from "@/types/domain";

export const PHASE_META: Record<
  ProjectPhase,
  {
    step: number;
    short: string;
    accent: string;
    soft: string;
    text: string;
    dot: string;
  }
> = {
  Iniciación: {
    step: 1,
    short: "Iniciación",
    accent: "bg-sky-500",
    soft: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  Descubrimiento: {
    step: 2,
    short: "Descubrimiento",
    accent: "bg-blue-600",
    soft: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-600",
  },
  "Sistemas y Procesos": {
    step: 3,
    short: "Sistemas y Procesos",
    accent: "bg-indigo-500",
    soft: "bg-indigo-50 dark:bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  "Datos e Integración": {
    step: 4,
    short: "Datos e Integración",
    accent: "bg-violet-500",
    soft: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  Planificación: {
    step: 5,
    short: "Planificación",
    accent: "bg-amber-500",
    soft: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  Ejecución: {
    step: 6,
    short: "Ejecución",
    accent: "bg-emerald-500",
    soft: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  Cierre: {
    step: 7,
    short: "Cierre",
    accent: "bg-slate-500",
    soft: "bg-slate-100 dark:bg-slate-500/10",
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-500",
  },
};

export const STATUS_META: Record<
  ProjectStatus,
  { color: ChipProps["color"]; dot: string }
> = {
  Activo: { color: "success", dot: "bg-emerald-500" },
  "En Pausa": { color: "warning", dot: "bg-amber-500" },
  Cerrado: { color: "default", dot: "bg-slate-400" },
};

export const PRIORITY_META = {
  Alta: {
    chip: "danger" as ChipProps["color"],
    bar: "bg-rose-500",
    soft: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  },
  Media: {
    chip: "warning" as ChipProps["color"],
    bar: "bg-amber-500",
    soft: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  Baja: {
    chip: "default" as ChipProps["color"],
    bar: "bg-sky-500",
    soft: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  },
};

export const DOCUMENT_STATUS_COLOR: Record<
  DocumentStatus,
  "success" | "warning" | "default"
> = {
  Aprobado: "success",
  "En Revisión": "warning",
  Borrador: "default",
};

/** Etiquetas en español para los estados Kanban que se guardan en inglés. */
export const KANBAN_LABELS: Record<KanbanStatus, string> = {
  Backlog: "Backlog",
  "To Do": "Por hacer",
  "In Progress": "En curso",
  Review: "En revisión",
  Blocked: "Bloqueado",
  Done: "Hecho",
};
