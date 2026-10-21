import { BASE_TEMPLATES, emptyBpmn } from "../../src/shared/base-templates.js";
import { db, nowSeconds, num, one, str } from "./db.js";
import { HttpError } from "./http.js";
import { RESOURCES } from "./resources.js";
import { validate } from "./validate.js";

function defaultContent(format: string, name: string): string {
  return format === "Diagrama BPMN" ? emptyBpmn(name) : `# ${name}\n`;
}

export async function createTemplate(body: Record<string, unknown>) {
  const values = await validate(body, RESOURCES.templates.schema);
  const format = (values.format as string | null) ?? "Documento";
  const id = crypto.randomUUID();
  const position = num(
    (await one("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM master_templates WHERE phase = ?", [values.phase]))
      ?.next,
  );
  await db().execute({
    sql: `INSERT INTO master_templates (id, phase, name, format, description, content, position, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      values.phase,
      values.name,
      format,
      values.description,
      values.content ?? defaultContent(format, str(values.name)),
      position,
      nowSeconds(),
    ],
  });
  return { id };
}

export async function deleteTemplate(id: string) {
  const row = await one(
    "SELECT (SELECT COUNT(*) FROM project_documents WHERE template_id = ?) AS used FROM master_templates WHERE id = ?",
    [id, id],
  );
  if (!row) throw new HttpError(404, "Plantilla no encontrada");
  const used = num(row.used);
  if (used) {
    throw new HttpError(
      409,
      `La plantilla tiene ${used} documento${used === 1 ? "" : "s"} de proyecto. Elimínalos antes de borrarla.`,
    );
  }
  await db().execute({ sql: "DELETE FROM master_templates WHERE id = ?", args: [id] });
}

/** Inserta las plantillas base que aún no existen (misma fase y nombre). No toca las existentes. */
export async function seedBaseTemplates() {
  const now = nowSeconds();
  const results = await db().batch(
    BASE_TEMPLATES.map((template, index) => ({
      sql: `INSERT OR IGNORE INTO master_templates (id, phase, name, format, description, content, position, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        template.phase,
        template.name,
        template.format,
        template.description,
        template.content,
        index,
        now,
      ],
    })),
    "write",
  );
  return { created: results.reduce((total, result) => total + result.rowsAffected, 0) };
}

/** Crea el documento de un proyecto a partir de una plantilla, copiando su contenido. */
export async function createDocument(body: Record<string, unknown>) {
  const values = await validate(body, RESOURCES.documents.schema);
  const existing = await one("SELECT id FROM project_documents WHERE project_id = ? AND template_id = ?", [
    values.project_id,
    values.template_id,
  ]);
  if (existing) return { id: str(existing.id), created: false };

  const template = await one("SELECT content FROM master_templates WHERE id = ?", [values.template_id]);
  const id = crypto.randomUUID();
  const now = nowSeconds();
  await db().execute({
    sql: `INSERT INTO project_documents (id, project_id, template_id, content, status, updated_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      values.project_id,
      values.template_id,
      values.content ?? template?.content ?? null,
      values.status ?? "Borrador",
      now,
      now,
    ],
  });
  return { id, created: true };
}
