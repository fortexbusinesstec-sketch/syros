import type { Row } from "@libsql/client/web";
import { all, iso, num, one, optStr, str } from "./db.js";

function groupNames(rows: Row[], key: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const id = str(row[key]);
    map.set(id, [...(map.get(id) ?? []), str(row.name)]);
  }
  return map;
}

export async function listProjects(projectId?: string) {
  const where = projectId ? "WHERE p.id = ?" : "";
  const args = projectId ? [projectId] : [];
  const [rows, members, tags] = await Promise.all([
    all(
      `SELECT p.*,
         (SELECT COUNT(*) FROM sprint_tasks t JOIN sprints s ON s.id = t.sprint_id WHERE s.project_id = p.id) AS task_total,
         (SELECT COUNT(*) FROM sprint_tasks t JOIN sprints s ON s.id = t.sprint_id
           WHERE s.project_id = p.id AND t.kanban_status = 'Done') AS task_done,
         (SELECT COUNT(*) FROM project_documents d WHERE d.project_id = p.id) AS document_count,
         (SELECT COUNT(*) FROM stakeholders k WHERE k.project_id = p.id) AS stakeholder_count,
         (SELECT COUNT(*) FROM functional_requirements r WHERE r.project_id = p.id) AS requirement_count,
         (SELECT COUNT(*) FROM project_risks x WHERE x.project_id = p.id AND COALESCE(x.status, 'Abierto') <> 'Cerrado') AS open_risk_count,
         (SELECT COUNT(*) FROM stakeholder_kpis i WHERE i.project_id = p.id) AS kpi_count
       FROM projects p ${where}
       ORDER BY p.created_at DESC, p.name`,
      args,
    ),
    all(`SELECT project_id, name FROM project_members ${projectId ? "WHERE project_id = ?" : ""} ORDER BY position, name`, args),
    all(
      `SELECT pt.project_id, t.name FROM project_tags pt JOIN tags t ON t.id = pt.tag_id
       ${projectId ? "WHERE pt.project_id = ?" : ""} ORDER BY t.name`,
      args,
    ),
  ]);
  const membersByProject = groupNames(members, "project_id");
  const tagsByProject = groupNames(tags, "project_id");

  return rows.map((row) => {
    const id = str(row.id);
    const total = num(row.task_total);
    return {
      id,
      name: str(row.name),
      description: optStr(row.description),
      current_phase: str(row.current_phase),
      status: str(row.status),
      start_date: optStr(row.start_date),
      estimated_end_date: optStr(row.estimated_end_date),
      created_at: iso(row.created_at),
      owner: optStr(row.owner),
      team: membersByProject.get(id) ?? [],
      tags: tagsByProject.get(id) ?? [],
      progress: total ? Math.round((num(row.task_done) / total) * 100) : 0,
      task_total: total,
      document_count: num(row.document_count),
      stakeholder_count: num(row.stakeholder_count),
      requirement_count: num(row.requirement_count),
      open_risk_count: num(row.open_risk_count),
      kpi_count: num(row.kpi_count),
    };
  });
}

// Los listados no incluyen el contenido (puede pesar varios cientos de KB por documento).
const DOCUMENT_SELECT = `
  SELECT d.id, d.project_id, p.name AS project_name, d.template_id, m.name, m.phase, m.format,
         d.status, d.updated_at
    FROM project_documents d
    JOIN master_templates m ON m.id = d.template_id
    JOIN projects p ON p.id = d.project_id`;

function mapDocument(row: Row) {
  return {
    id: str(row.id),
    project_id: str(row.project_id),
    project_name: str(row.project_name),
    template_id: str(row.template_id),
    name: str(row.name),
    phase: str(row.phase),
    format: str(row.format) || "Documento",
    status: str(row.status),
    updated_at: iso(row.updated_at),
  };
}

export async function getDocument(id: string) {
  const row = await one(
    `SELECT d.id, d.project_id, p.name AS project_name, d.template_id, m.name, m.phase, m.format,
            d.status, d.updated_at, d.content
       FROM project_documents d
       JOIN master_templates m ON m.id = d.template_id
       JOIN projects p ON p.id = d.project_id
      WHERE d.id = ?`,
    [id],
  );
  return row ? { ...mapDocument(row), content: str(row.content) } : null;
}

export async function projectDocuments(projectId: string) {
  const rows = await all(`${DOCUMENT_SELECT} WHERE d.project_id = ? ORDER BY d.updated_at DESC`, [projectId]);
  return rows.map(mapDocument);
}

export async function recentDocuments(sinceSeconds: number) {
  const rows = await all(`${DOCUMENT_SELECT} WHERE d.updated_at >= ? ORDER BY d.updated_at DESC LIMIT 50`, [
    sinceSeconds,
  ]);
  return rows.map(mapDocument);
}

export async function projectStakeholders(projectId: string) {
  const rows = await all(
    `SELECT * FROM stakeholders WHERE project_id = ?
      ORDER BY CASE influence WHEN 'Alta' THEN 0 WHEN 'Media' THEN 1 ELSE 2 END, name`,
    [projectId],
  );
  return rows.map((row) => ({
    id: str(row.id),
    project_id: str(row.project_id),
    name: str(row.name),
    role: optStr(row.role),
    company_area: optStr(row.company_area),
    email: optStr(row.email),
    phone: optStr(row.phone),
    influence: str(row.influence) || "Media",
    interest: str(row.interest) || "Medio",
    engagement: str(row.engagement),
    notes: optStr(row.notes),
  }));
}

export async function projectRequirements(projectId: string) {
  const rows = await all(
    `SELECT * FROM functional_requirements WHERE project_id = ?
      ORDER BY CASE type WHEN 'Épica' THEN 0 WHEN 'Historia de Usuario' THEN 1 ELSE 2 END,
               code IS NULL, code, created_at`,
    [projectId],
  );
  return rows.map((row) => ({
    id: str(row.id),
    project_id: str(row.project_id),
    type: str(row.type),
    code: optStr(row.code),
    title: str(row.title),
    description: optStr(row.description),
    acceptance_criteria: optStr(row.acceptance_criteria),
    parent_id: optStr(row.parent_id),
    priority: str(row.priority) || "Media",
    status: str(row.status) || "Backlog",
  }));
}

export async function projectRisks(projectId: string) {
  const rows = await all(
    `SELECT * FROM project_risks WHERE project_id = ?
      ORDER BY CASE status WHEN 'Cerrado' THEN 1 ELSE 0 END,
               CASE probability WHEN 'Alta' THEN 0 WHEN 'Media' THEN 1 ELSE 2 END
             + CASE impact WHEN 'Alto' THEN 0 WHEN 'Medio' THEN 1 ELSE 2 END,
               created_at`,
    [projectId],
  );
  return rows.map((row) => ({
    id: str(row.id),
    project_id: str(row.project_id),
    description: str(row.description),
    category: optStr(row.category),
    probability: optStr(row.probability),
    impact: optStr(row.impact),
    response: optStr(row.response),
    mitigation_plan: optStr(row.mitigation_plan),
    owner: optStr(row.owner),
    status: str(row.status) || "Abierto",
  }));
}

export async function projectKpis(projectId: string) {
  const rows = await all(
    `SELECT k.*, s.name AS stakeholder_name FROM stakeholder_kpis k
       LEFT JOIN stakeholders s ON s.id = k.stakeholder_id
      WHERE k.project_id = ? ORDER BY s.name IS NULL, s.name, k.created_at`,
    [projectId],
  );
  return rows.map((row) => ({
    id: str(row.id),
    project_id: str(row.project_id),
    stakeholder_id: optStr(row.stakeholder_id),
    stakeholder_name: optStr(row.stakeholder_name),
    name: str(row.name),
    description: optStr(row.description),
    metric: optStr(row.metric),
    unit: optStr(row.unit),
    baseline_value: optStr(row.baseline_value),
    target_value: optStr(row.target_value),
    actual_value: optStr(row.actual_value),
    frequency: optStr(row.frequency),
    status: str(row.status) || "Sin medir",
  }));
}

export async function projectSprints(projectId: string) {
  const rows = await all("SELECT * FROM sprints WHERE project_id = ? ORDER BY start_date, created_at", [projectId]);
  return rows.map((row) => ({
    id: str(row.id),
    project_id: str(row.project_id),
    name: str(row.name),
    goal: optStr(row.goal),
    start_date: optStr(row.start_date),
    end_date: optStr(row.end_date),
    status: str(row.status),
  }));
}

export async function projectTasks(projectId: string) {
  const rows = await all(
    `SELECT t.*, s.project_id FROM sprint_tasks t JOIN sprints s ON s.id = t.sprint_id
      WHERE s.project_id = ? ORDER BY t.due_date IS NULL, t.due_date, t.created_at`,
    [projectId],
  );
  return rows.map((row) => ({
    id: str(row.id),
    sprint_id: str(row.sprint_id),
    project_id: str(row.project_id),
    title: str(row.title),
    description: optStr(row.description),
    assignee: optStr(row.assignee),
    kanban_status: str(row.kanban_status),
    priority: str(row.priority),
    due_date: optStr(row.due_date),
    tag: optStr(row.tag),
  }));
}

export async function listReminders() {
  const rows = await all(
    `SELECT r.*, p.name AS project_name FROM tasks_reminders r LEFT JOIN projects p ON p.id = r.project_id
      ORDER BY r.due_date IS NULL, r.due_date, r.created_at`,
  );
  return rows.map((row) => ({
    id: str(row.id),
    title: str(row.title),
    description: optStr(row.description),
    due_date: optStr(row.due_date),
    status: str(row.status),
    priority: str(row.priority),
    project_id: optStr(row.project_id),
    project_name: optStr(row.project_name),
  }));
}

export async function listNotes() {
  const [rows, tags] = await Promise.all([
    all("SELECT * FROM general_notes ORDER BY updated_at DESC"),
    all("SELECT nt.note_id, t.name FROM note_tags nt JOIN tags t ON t.id = nt.tag_id ORDER BY t.name"),
  ]);
  const tagsByNote = groupNames(tags, "note_id");
  return rows.map((row) => ({
    id: str(row.id),
    title: str(row.title),
    content: optStr(row.content),
    category: optStr(row.category),
    tags: tagsByNote.get(str(row.id)) ?? [],
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  }));
}

export async function getNote(noteId: string) {
  const row = await one("SELECT * FROM general_notes WHERE id = ?", [noteId]);
  if (!row) return null;
  const tags = await all(
    "SELECT t.name FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = ? ORDER BY t.name",
    [noteId],
  );
  return {
    id: str(row.id),
    title: str(row.title),
    content: optStr(row.content),
    category: optStr(row.category),
    tags: tags.map((tag) => str(tag.name)),
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
}

export async function listCourses() {
  const rows = await all(
    "SELECT * FROM courses_certifications ORDER BY completion_date IS NOT NULL, completion_date DESC, created_at DESC",
  );
  return rows.map((row) => ({
    id: str(row.id),
    name: str(row.name),
    platform: optStr(row.platform),
    completion_date: optStr(row.completion_date),
    certificate_url: optStr(row.certificate_url),
    learning_doc: optStr(row.learning_doc),
    created_at: iso(row.created_at),
  }));
}

export async function getCourse(courseId: string) {
  const row = await one("SELECT * FROM courses_certifications WHERE id = ?", [courseId]);
  if (!row) return null;
  return {
    id: str(row.id),
    name: str(row.name),
    platform: optStr(row.platform),
    completion_date: optStr(row.completion_date),
    certificate_url: optStr(row.certificate_url),
    learning_doc: optStr(row.learning_doc),
    created_at: iso(row.created_at),
  };
}

function mapTemplate(row: Row) {
  return {
    id: str(row.id),
    phase: str(row.phase),
    name: str(row.name),
    format: str(row.format) || "Documento",
    description: optStr(row.description),
    position: num(row.position),
    document_count: num(row.document_count),
    updated_at: iso(row.updated_at ?? row.created_at),
  };
}

const TEMPLATE_COLUMNS = `m.id, m.phase, m.name, m.format, m.description, m.position, m.updated_at, m.created_at,
  (SELECT COUNT(*) FROM project_documents d WHERE d.template_id = m.id) AS document_count`;

export async function listTemplates() {
  const rows = await all(`SELECT ${TEMPLATE_COLUMNS} FROM master_templates m ORDER BY m.position, m.name`);
  return rows.map(mapTemplate);
}

export async function getTemplate(id: string) {
  const row = await one(`SELECT ${TEMPLATE_COLUMNS}, m.content FROM master_templates m WHERE m.id = ?`, [id]);
  return row ? { ...mapTemplate(row), content: str(row.content) } : null;
}

export async function summary(today: string, recentSince: number) {
  const [counts, milestone] = await Promise.all([
    one(
      `SELECT
         (SELECT COUNT(*) FROM projects) AS projects_total,
         (SELECT COUNT(*) FROM projects WHERE status = 'Activo') AS projects_active,
         (SELECT COUNT(*) FROM sprints WHERE status = 'Activo') AS sprints_active,
         (SELECT COUNT(*) FROM tasks_reminders WHERE status <> 'Completado') AS reminders_open,
         (SELECT COUNT(*) FROM tasks_reminders WHERE status <> 'Completado' AND priority = 'Alta') AS reminders_high,
         (SELECT COUNT(*) FROM tasks_reminders
           WHERE status <> 'Completado' AND due_date IS NOT NULL AND substr(due_date, 1, 10) < ?) AS reminders_overdue,
         (SELECT COUNT(*) FROM project_documents) AS documents_total,
         (SELECT COUNT(*) FROM project_documents WHERE updated_at >= ?) AS documents_recent`,
      [today, recentSince],
    ),
    one(
      `SELECT kind, label, date, project_id FROM (
         SELECT 'project' AS kind, 'Cierre de ' || name AS label, estimated_end_date AS date, id AS project_id
           FROM projects WHERE status <> 'Cerrado' AND estimated_end_date >= ?
         UNION ALL
         SELECT 'sprint', 'Fin de ' || s.name, s.end_date, s.project_id
           FROM sprints s WHERE s.status <> 'Cerrado' AND s.end_date >= ?
       ) ORDER BY date LIMIT 1`,
      [today, today],
    ),
  ]);

  return {
    projects: { total: num(counts?.projects_total), active: num(counts?.projects_active) },
    sprints: { active: num(counts?.sprints_active) },
    reminders: {
      open: num(counts?.reminders_open),
      high: num(counts?.reminders_high),
      overdue: num(counts?.reminders_overdue),
    },
    documents: { total: num(counts?.documents_total), recent: num(counts?.documents_recent) },
    next_milestone: milestone
      ? {
          kind: str(milestone.kind),
          label: str(milestone.label),
          date: str(milestone.date),
          project_id: str(milestone.project_id),
        }
      : null,
  };
}
