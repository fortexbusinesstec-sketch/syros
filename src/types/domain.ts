// Valores canónicos tal como se guardan en Turso. Los comparten el frontend y la API.

export const PROJECT_PHASES = [
  "Iniciación",
  "Descubrimiento",
  "Sistemas y Procesos",
  "Datos e Integración",
  "Planificación",
  "Ejecución",
  "Cierre",
] as const;

export const PROJECT_STATUSES = ["Activo", "En Pausa", "Cerrado"] as const;

export const SPRINT_STATUSES = ["Planificado", "Activo", "Cerrado"] as const;

export const KANBAN_STATUSES = [
  "Backlog",
  "To Do",
  "In Progress",
  "Review",
  "Blocked",
  "Done",
] as const;

export const PRIORITIES = ["Alta", "Media", "Baja"] as const;

export const REMINDER_STATUSES = ["Pendiente", "En Proceso", "Completado"] as const;

export const DOCUMENT_STATUSES = ["Borrador", "En Revisión", "Aprobado"] as const;

/** Documento: editor enriquecido (Markdown + tablas + Mermaid). Diagrama BPMN: XML BPMN 2.0. */
export const TEMPLATE_FORMATS = ["Documento", "Diagrama BPMN"] as const;

export const INFLUENCE_LEVELS = ["Alta", "Media", "Baja"] as const;

export const ENGAGEMENT_LEVELS = ["Activo", "Pendiente", "Inactivo"] as const;

export const NOTE_CATEGORIES = [
  "Proceso",
  "Automatización",
  "Datos",
  "Metodología",
] as const;

export const INTEREST_LEVELS = ["Alto", "Medio", "Bajo"] as const;

export const REQUIREMENT_TYPES = ["Épica", "Historia de Usuario", "Caso de Uso"] as const;

export const REQUIREMENT_STATUSES = [
  "Backlog",
  "En análisis",
  "Aprobado",
  "En desarrollo",
  "Hecho",
] as const;

export const RISK_CATEGORIES = ["Técnico", "Negocio", "Datos", "Proveedor", "Personas", "Legal"] as const;

export const IMPACT_LEVELS = ["Alto", "Medio", "Bajo"] as const;

export const RISK_RESPONSES = ["Evitar", "Mitigar", "Transferir", "Aceptar"] as const;

export const RISK_STATUSES = ["Abierto", "En seguimiento", "Cerrado"] as const;

export const KPI_STATUSES = ["Sin medir", "En meta", "En riesgo", "Fuera de meta"] as const;

export const KPI_FREQUENCIES = ["Diaria", "Semanal", "Mensual", "Trimestral", "Por hito"] as const;

export type ProjectPhase = (typeof PROJECT_PHASES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type SprintStatus = (typeof SPRINT_STATUSES)[number];
export type KanbanStatus = (typeof KANBAN_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export type TemplateFormat = (typeof TEMPLATE_FORMATS)[number];
export type InfluenceLevel = (typeof INFLUENCE_LEVELS)[number];
export type EngagementLevel = (typeof ENGAGEMENT_LEVELS)[number];
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];
export type InterestLevel = (typeof INTEREST_LEVELS)[number];
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];
export type RiskCategory = (typeof RISK_CATEGORIES)[number];
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];
export type RiskResponse = (typeof RISK_RESPONSES)[number];
export type RiskStatus = (typeof RISK_STATUSES)[number];
export type KpiStatus = (typeof KPI_STATUSES)[number];
export type KpiFrequency = (typeof KPI_FREQUENCIES)[number];
