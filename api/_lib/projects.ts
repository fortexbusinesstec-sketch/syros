import type { InStatement } from "@libsql/client/web";
import { PROJECT_PHASES, PROJECT_STATUSES } from "../../src/types/domain.js";
import { db, one } from "./db.js";
import { HttpError } from "./http.js";
import { stringList, validate, type Schema } from "./validate.js";

const PROJECT_SCHEMA: Schema = {
  name: { kind: "text", max: 120, required: true },
  description: { kind: "text", max: 4000 },
  current_phase: { kind: "enum", values: PROJECT_PHASES, required: true },
  status: { kind: "enum", values: PROJECT_STATUSES, required: true },
  start_date: { kind: "date" },
  estimated_end_date: { kind: "date" },
  owner: { kind: "text", max: 120 },
};

function replaceTeam(projectId: string, team: string[]): InStatement[] {
  return [
    { sql: "DELETE FROM project_members WHERE project_id = ?", args: [projectId] },
    ...team.map((name, position) => ({
      sql: "INSERT INTO project_members (project_id, name, position) VALUES (?, ?, ?)",
      args: [projectId, name, position],
    })),
  ];
}

function replaceTags(projectId: string, tags: string[]): InStatement[] {
  return [
    { sql: "DELETE FROM project_tags WHERE project_id = ?", args: [projectId] },
    ...tags.flatMap((name) => [
      { sql: "INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)", args: [crypto.randomUUID(), name] },
      {
        sql: "INSERT OR IGNORE INTO project_tags (project_id, tag_id) SELECT ?, id FROM tags WHERE name = ?",
        args: [projectId, name],
      },
    ]),
  ];
}

export async function createProject(body: Record<string, unknown>, ownerFallback: string) {
  const values = await validate(body, PROJECT_SCHEMA);
  const id = crypto.randomUUID();
  const owner = (values.owner as string | null) ?? ownerFallback;
  const team = stringList(body.team, "team");
  if (!team.includes(owner)) team.unshift(owner);

  await db().batch(
    [
      {
        sql: `INSERT INTO projects (id, name, description, current_phase, status, start_date, estimated_end_date, owner)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          values.name,
          values.description,
          values.current_phase,
          values.status,
          values.start_date ?? new Date().toISOString().slice(0, 10),
          values.estimated_end_date,
          owner,
        ],
      },
      ...replaceTeam(id, team),
      ...replaceTags(id, stringList(body.tags, "tags")),
    ],
    "write",
  );
  return id;
}

export async function updateProject(id: string, body: Record<string, unknown>) {
  if (!(await one("SELECT 1 FROM projects WHERE id = ?", [id]))) {
    throw new HttpError(404, "Proyecto no encontrado");
  }
  const values = await validate(body, PROJECT_SCHEMA, true);
  const columns = Object.keys(values);
  const statements: InStatement[] = [];
  if (columns.length) {
    statements.push({
      sql: `UPDATE projects SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
      args: [...Object.values(values), id],
    });
  }
  if ("team" in body) statements.push(...replaceTeam(id, stringList(body.team, "team")));
  if ("tags" in body) statements.push(...replaceTags(id, stringList(body.tags, "tags")));
  if (!statements.length) throw new HttpError(400, "No hay campos para actualizar");
  await db().batch(statements, "write");
}

export async function deleteProject(id: string) {
  if (!(await one("SELECT 1 FROM projects WHERE id = ?", [id]))) {
    throw new HttpError(404, "Proyecto no encontrado");
  }
  // Borrado explícito de dependientes por si la conexión no tiene activado PRAGMA foreign_keys.
  await db().batch(
    [
      "DELETE FROM sprint_tasks WHERE sprint_id IN (SELECT id FROM sprints WHERE project_id = ?)",
      "DELETE FROM sprints WHERE project_id = ?",
      "DELETE FROM stakeholder_kpis WHERE project_id = ?",
      "DELETE FROM stakeholder_requests WHERE project_id = ?",
      "DELETE FROM stakeholders WHERE project_id = ?",
      "DELETE FROM project_documents WHERE project_id = ?",
      "DELETE FROM project_risks WHERE project_id = ?",
      "DELETE FROM functional_requirements WHERE project_id = ?",
      "DELETE FROM closure_documents WHERE project_id = ?",
      "UPDATE tasks_reminders SET project_id = NULL WHERE project_id = ?",
      "DELETE FROM project_members WHERE project_id = ?",
      "DELETE FROM project_tags WHERE project_id = ?",
      "DELETE FROM projects WHERE id = ?",
    ].map((sql) => ({ sql, args: [id] })),
    "write",
  );
}
