import type { InValue } from "@libsql/client/web";
import {
  DOCUMENT_STATUSES,
  ENGAGEMENT_LEVELS,
  IMPACT_LEVELS,
  INFLUENCE_LEVELS,
  INTEREST_LEVELS,
  KANBAN_STATUSES,
  KPI_FREQUENCIES,
  KPI_STATUSES,
  NOTE_CATEGORIES,
  PRIORITIES,
  PROJECT_PHASES,
  REMINDER_STATUSES,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
  RISK_CATEGORIES,
  RISK_RESPONSES,
  RISK_STATUSES,
  SPRINT_STATUSES,
  TEMPLATE_FORMATS,
} from "../../src/types/domain.js";
import { db, nowSeconds, one } from "./db.js";
import { HttpError } from "./http.js";
import { validate, type Schema } from "./validate.js";

/** Límite de contenido de documentos y plantillas (Markdown con tablas o XML BPMN). */
const MAX_CONTENT = 2_000_000;

interface Resource {
  table: string;
  schema: Schema;
  /** Columna que se actualiza con la hora actual en cada PATCH. */
  touch?: string;
  /** Validaciones entre registros (p. ej. que un KPI apunte a un stakeholder del mismo proyecto). */
  check?: (values: Record<string, InValue>, projectId: string, id?: string) => Promise<void>;
  /** Sentencias a ejecutar antes de borrar (el `?` es el id). Cubre FKs que la conexión no aplique. */
  beforeDelete?: string[];
}

async function projectIdOf(table: string, id: string): Promise<string> {
  const row = await one(`SELECT project_id FROM ${table} WHERE id = ?`, [id]);
  if (!row) throw new HttpError(404, "Registro no encontrado");
  return String(row.project_id);
}

/** Recursos con CRUD genérico: POST /api/<nombre>, PATCH y DELETE /api/<nombre>/<id>. */
export const RESOURCES: Record<string, Resource> = {
  stakeholders: {
    table: "stakeholders",
    schema: {
      project_id: { kind: "ref", table: "projects", required: true },
      name: { kind: "text", max: 120, required: true },
      role: { kind: "text", max: 120 },
      company_area: { kind: "text", max: 120 },
      email: { kind: "email" },
      phone: { kind: "text", max: 40 },
      influence: { kind: "enum", values: INFLUENCE_LEVELS },
      interest: { kind: "enum", values: INTEREST_LEVELS },
      engagement: { kind: "enum", values: ENGAGEMENT_LEVELS },
      notes: { kind: "text", max: 4000 },
    },
    beforeDelete: [
      "UPDATE stakeholder_kpis SET stakeholder_id = NULL WHERE stakeholder_id = ?",
      "DELETE FROM stakeholder_requests WHERE stakeholder_id = ?",
    ],
  },
  requirements: {
    table: "functional_requirements",
    schema: {
      project_id: { kind: "ref", table: "projects", required: true },
      type: { kind: "enum", values: REQUIREMENT_TYPES, required: true },
      code: { kind: "text", max: 20 },
      title: { kind: "text", max: 300, required: true },
      description: { kind: "text", max: 8000 },
      acceptance_criteria: { kind: "text", max: 8000 },
      parent_id: { kind: "ref", table: "functional_requirements" },
      priority: { kind: "enum", values: PRIORITIES },
      status: { kind: "enum", values: REQUIREMENT_STATUSES },
    },
    async check(values, projectId, id) {
      if (!values.parent_id) return;
      if (values.parent_id === id) throw new HttpError(400, "parent_id: no puede apuntar a sí mismo");
      const parent = await one("SELECT project_id, type FROM functional_requirements WHERE id = ?", [values.parent_id]);
      if (parent?.project_id !== projectId || parent?.type !== "Épica") {
        throw new HttpError(400, "parent_id: debe ser una épica del mismo proyecto");
      }
    },
    beforeDelete: ["UPDATE functional_requirements SET parent_id = NULL WHERE parent_id = ?"],
  },
  risks: {
    table: "project_risks",
    schema: {
      project_id: { kind: "ref", table: "projects", required: true },
      description: { kind: "text", max: 1000, required: true },
      category: { kind: "enum", values: RISK_CATEGORIES },
      probability: { kind: "enum", values: PRIORITIES },
      impact: { kind: "enum", values: IMPACT_LEVELS },
      response: { kind: "enum", values: RISK_RESPONSES },
      mitigation_plan: { kind: "text", max: 4000 },
      owner: { kind: "text", max: 120 },
      status: { kind: "enum", values: RISK_STATUSES },
    },
  },
  kpis: {
    table: "stakeholder_kpis",
    schema: {
      project_id: { kind: "ref", table: "projects", required: true },
      stakeholder_id: { kind: "ref", table: "stakeholders" },
      name: { kind: "text", max: 200, required: true },
      description: { kind: "text", max: 2000 },
      metric: { kind: "text", max: 500 },
      unit: { kind: "text", max: 40 },
      baseline_value: { kind: "text", max: 60 },
      target_value: { kind: "text", max: 60 },
      actual_value: { kind: "text", max: 60 },
      frequency: { kind: "enum", values: KPI_FREQUENCIES },
      status: { kind: "enum", values: KPI_STATUSES },
    },
    async check(values, projectId) {
      if (!values.stakeholder_id) return;
      const stakeholder = await one("SELECT project_id FROM stakeholders WHERE id = ?", [values.stakeholder_id]);
      if (stakeholder?.project_id !== projectId) {
        throw new HttpError(400, "stakeholder_id: debe ser un stakeholder del mismo proyecto");
      }
    },
  },
  sprints: {
    table: "sprints",
    schema: {
      project_id: { kind: "ref", table: "projects", required: true },
      name: { kind: "text", max: 120, required: true },
      goal: { kind: "text", max: 2000 },
      start_date: { kind: "date" },
      end_date: { kind: "date" },
      status: { kind: "enum", values: SPRINT_STATUSES },
    },
    beforeDelete: ["DELETE FROM sprint_tasks WHERE sprint_id = ?"],
  },
  "sprint-tasks": {
    table: "sprint_tasks",
    schema: {
      sprint_id: { kind: "ref", table: "sprints", required: true },
      title: { kind: "text", max: 200, required: true },
      description: { kind: "text", max: 4000 },
      assignee: { kind: "text", max: 120 },
      kanban_status: { kind: "enum", values: KANBAN_STATUSES },
      priority: { kind: "enum", values: PRIORITIES },
      due_date: { kind: "date" },
      tag: { kind: "text", max: 40 },
      dependency_task_id: { kind: "ref", table: "sprint_tasks" },
    },
    beforeDelete: ["UPDATE sprint_tasks SET dependency_task_id = NULL WHERE dependency_task_id = ?"],
  },
  reminders: {
    table: "tasks_reminders",
    schema: {
      title: { kind: "text", max: 200, required: true },
      description: { kind: "text", max: 4000 },
      due_date: { kind: "datetime" },
      status: { kind: "enum", values: REMINDER_STATUSES },
      priority: { kind: "enum", values: PRIORITIES },
      project_id: { kind: "ref", table: "projects" },
    },
  },
  notes: {
    table: "general_notes",
    touch: "updated_at",
    schema: {
      title: { kind: "text", max: 200, required: true },
      content: { kind: "text", max: 50000 },
      category: { kind: "enum", values: NOTE_CATEGORIES },
    },
  },
  courses: {
    table: "courses_certifications",
    schema: {
      name: { kind: "text", max: 200, required: true },
      platform: { kind: "text", max: 120 },
      completion_date: { kind: "date" },
      certificate_url: { kind: "url" },
      learning_doc: { kind: "text", max: 50000 },
    },
  },
  templates: {
    table: "master_templates",
    touch: "updated_at",
    schema: {
      phase: { kind: "enum", values: PROJECT_PHASES, required: true },
      name: { kind: "text", max: 120, required: true },
      format: { kind: "enum", values: TEMPLATE_FORMATS },
      description: { kind: "text", max: 500 },
      content: { kind: "text", max: MAX_CONTENT },
    },
  },
  documents: {
    table: "project_documents",
    touch: "updated_at",
    schema: {
      project_id: { kind: "ref", table: "projects", required: true },
      template_id: { kind: "ref", table: "master_templates", required: true },
      content: { kind: "text", max: MAX_CONTENT },
      status: { kind: "enum", values: DOCUMENT_STATUSES },
    },
  },
};

/** En un INSERT, los campos opcionales vacíos se omiten para que apliquen los DEFAULT de la tabla. */
function withoutNulls(values: Record<string, InValue>): Record<string, InValue> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null));
}

export async function createRecord(resource: Resource, body: Record<string, unknown>) {
  const validated = await validate(body, resource.schema);
  if (resource.check) await resource.check(validated, String(validated.project_id));
  const values = { id: crypto.randomUUID(), ...withoutNulls(validated) };
  const columns = Object.keys(values);
  await db().execute({
    sql: `INSERT INTO ${resource.table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    args: Object.values(values),
  });
  return { id: values.id };
}

export async function updateRecord(resource: Resource, id: string, body: Record<string, unknown>) {
  const values = await validate(body, resource.schema, true);
  if (resource.check) {
    const projectId = values.project_id ? String(values.project_id) : await projectIdOf(resource.table, id);
    await resource.check(values, projectId, id);
  }
  if (resource.touch) values[resource.touch] = nowSeconds();
  const columns = Object.keys(values);
  if (!columns.length) throw new HttpError(400, "No hay campos para actualizar");
  const result = await db().execute({
    sql: `UPDATE ${resource.table} SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
    args: [...Object.values(values), id],
  });
  if (!result.rowsAffected) throw new HttpError(404, "Registro no encontrado");
  return { id };
}

export async function deleteRecord(resource: Resource, id: string) {
  if (!(await one(`SELECT 1 FROM ${resource.table} WHERE id = ?`, [id]))) {
    throw new HttpError(404, "Registro no encontrado");
  }
  await db().batch(
    [...(resource.beforeDelete ?? []), `DELETE FROM ${resource.table} WHERE id = ?`].map((sql) => ({
      sql,
      args: [id],
    })),
    "write",
  );
}
