// Aplica las migraciones pendientes en Turso. Uso: npm run db:migrate
// Cada migración se ejecuta una sola vez y queda registrada en schema_migrations.
import { createClient } from "@libsql/client/web";

try {
  process.loadEnvFile(".env");
} catch {
  // En CI/Vercel las variables ya vienen del entorno.
}

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN });

const migrations = [
  {
    id: "001_auth",
    statements: [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER DEFAULT (CAST(unixepoch() AS INT))
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL, -- SHA-256 del token; el token en claro solo vive en la cookie
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER DEFAULT (CAST(unixepoch() AS INT)),
        CONSTRAINT fk_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
      "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)",
      "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at)",
      `CREATE TABLE IF NOT EXISTS login_attempts (
        key TEXT PRIMARY KEY NOT NULL, -- ip:<ip> o email:<correo>
        failures INTEGER NOT NULL DEFAULT 0,
        window_start INTEGER NOT NULL
      )`,
    ],
  },
  {
    id: "002_app_fields",
    statements: [
      "ALTER TABLE projects ADD COLUMN owner TEXT",
      `CREATE TABLE IF NOT EXISTS project_members (
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (project_id, name),
        CONSTRAINT fk_project_members_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS project_tags (
        project_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (project_id, tag_id),
        CONSTRAINT fk_project_tags_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        CONSTRAINT fk_project_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
      )`,
      "ALTER TABLE sprint_tasks ADD COLUMN priority TEXT DEFAULT 'Media'", // Alta, Media, Baja
      "ALTER TABLE sprint_tasks ADD COLUMN due_date TEXT",
      "ALTER TABLE sprint_tasks ADD COLUMN tag TEXT",
      "ALTER TABLE stakeholders ADD COLUMN influence TEXT DEFAULT 'Media'", // Alta, Media, Baja
      "ALTER TABLE stakeholders ADD COLUMN engagement TEXT DEFAULT 'Pendiente'", // Activo, Pendiente, Inactivo
      "ALTER TABLE general_notes ADD COLUMN category TEXT", // Proceso, Automatización, Datos, Metodología
      "CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints (project_id)",
      "CREATE INDEX IF NOT EXISTS idx_sprint_tasks_sprint_id ON sprint_tasks (sprint_id)",
      "CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders (project_id)",
      "CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents (project_id)",
      "CREATE INDEX IF NOT EXISTS idx_project_documents_updated_at ON project_documents (updated_at)",
      "CREATE INDEX IF NOT EXISTS idx_tasks_reminders_project_id ON tasks_reminders (project_id)",
    ],
  },
  {
    id: "003_templates_content",
    statements: [
      // format pasa a ser: Documento | Diagrama BPMN
      "UPDATE master_templates SET format = 'Documento' WHERE format IS NULL OR format NOT IN ('Documento', 'Diagrama BPMN')",
      "ALTER TABLE master_templates ADD COLUMN description TEXT",
      "ALTER TABLE master_templates ADD COLUMN content TEXT", // Markdown del editor o XML BPMN
      "ALTER TABLE master_templates ADD COLUMN position INTEGER DEFAULT 0",
      "ALTER TABLE master_templates ADD COLUMN updated_at INTEGER",
      "UPDATE master_templates SET updated_at = created_at WHERE updated_at IS NULL",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_master_templates_phase_name ON master_templates (phase, name)",
      // Un documento por plantilla y proyecto
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_project_documents_project_template ON project_documents (project_id, template_id)",
    ],
  },
  {
    id: "004_registers",
    statements: [
      // Stakeholders: Nombre, Influencia, Interés, Notas
      "ALTER TABLE stakeholders ADD COLUMN interest TEXT DEFAULT 'Medio'", // Alto, Medio, Bajo
      "ALTER TABLE stakeholders ADD COLUMN notes TEXT",
      // Requerimientos: épicas, historias de usuario (hijas de una épica) y casos de uso
      "ALTER TABLE functional_requirements ADD COLUMN code TEXT", // EP-01, HU-01, CU-01
      "ALTER TABLE functional_requirements ADD COLUMN parent_id TEXT", // HU → épica
      "ALTER TABLE functional_requirements ADD COLUMN priority TEXT DEFAULT 'Media'",
      "CREATE INDEX IF NOT EXISTS idx_functional_requirements_project_id ON functional_requirements (project_id)",
      // Riesgos
      "ALTER TABLE project_risks ADD COLUMN category TEXT", // Técnico, Negocio, Datos, Proveedor, Personas, Legal
      "ALTER TABLE project_risks ADD COLUMN response TEXT", // Evitar, Mitigar, Transferir, Aceptar
      "ALTER TABLE project_risks ADD COLUMN status TEXT DEFAULT 'Abierto'", // Abierto, En seguimiento, Cerrado
      "CREATE INDEX IF NOT EXISTS idx_project_risks_project_id ON project_risks (project_id)",
      // KPIs por stakeholder
      "ALTER TABLE stakeholder_kpis ADD COLUMN baseline_value TEXT",
      "ALTER TABLE stakeholder_kpis ADD COLUMN frequency TEXT",
      "CREATE INDEX IF NOT EXISTS idx_stakeholder_kpis_project_id ON stakeholder_kpis (project_id)",
      // Estas plantillas pasan a ser registros del proyecto; se quitan si ningún documento las usa
      `DELETE FROM master_templates
        WHERE name IN ('Stakeholders del proyecto', 'Matriz de Riesgos', 'KPIs por Stakeholder', 'Épicas e Historias de Usuario', 'Casos de Uso')
          AND id NOT IN (SELECT template_id FROM project_documents)`,
    ],
  },
  {
    id: "006_document_image",
    statements: [
      // Columna separada para la imagen adjunta en documentos de tipo "Diagrama BPMN".
      // Permite que AS-IS / TO-BE tengan tanto el modelo BPMN como una imagen de referencia.
      "ALTER TABLE project_documents ADD COLUMN image TEXT",
    ],
  },
  {
    id: "005_imagen_format",
    statements: [
      // Nuevo tipo de plantilla: "Imagen" (el diagrama se sube a Cloudflare R2).
      "UPDATE master_templates SET format = 'Documento' WHERE format IS NULL OR format NOT IN ('Documento', 'Diagrama BPMN', 'Imagen')",
      // AS-IS / TO-BE pasan a ser de imagen, pero solo si el diagrama BPMN sigue vacío:
      // un diagrama con 4 o más elementos <bpmn:> ya tiene trabajo hecho y se respeta.
      `UPDATE master_templates
          SET format = 'Imagen', content = '', updated_at = CAST(unixepoch() AS INT)
        WHERE name IN ('Proceso AS-IS', 'Proceso TO-BE')
          AND format = 'Diagrama BPMN'
          AND (content IS NULL OR (length(content) - length(replace(content, '<bpmn:', ''))) / length('<bpmn:') <= 3)
          AND NOT EXISTS (
            SELECT 1 FROM project_documents d
             WHERE d.template_id = master_templates.id
               AND d.content IS NOT NULL
               AND (length(d.content) - length(replace(d.content, '<bpmn:', ''))) / length('<bpmn:') > 3
          )`,
    ],
  },
];

await db.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  applied_at INTEGER DEFAULT (CAST(unixepoch() AS INT))
)`);

const applied = new Set((await db.execute("SELECT id FROM schema_migrations")).rows.map((row) => row.id));

for (const migration of migrations) {
  if (applied.has(migration.id)) {
    console.log(`= ${migration.id} (ya aplicada)`);
    continue;
  }
  await db.batch(
    [...migration.statements, { sql: "INSERT INTO schema_migrations (id) VALUES (?)", args: [migration.id] }],
    "write",
  );
  console.log(`+ ${migration.id}`);
}

db.close();
