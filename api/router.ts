import { changePassword, getSessionUser, login, logout, requireUser } from "./_lib/auth.js";
import { db, nowSeconds } from "./_lib/db.js";
import { HttpError, assertSameOrigin, json, noContent, readJson, redirect } from "./_lib/http.js";
import { createProject, deleteProject, updateProject } from "./_lib/projects.js";
import { presignDownload, presignUpload, removeFile } from "./_lib/r2.js";
import {
  getCourse,
  getDocument,
  getNote,
  getTemplate,
  listCourses,
  listNotes,
  listProjects,
  listReminders,
  listTemplates,
  projectDocuments,
  projectKpis,
  projectRequirements,
  projectRisks,
  projectSprints,
  projectStakeholders,
  projectTasks,
  recentDocuments,
  summary,
} from "./_lib/queries.js";
import { RESOURCES, createRecord, deleteRecord, updateRecord } from "./_lib/resources.js";
import { createDocument, createTemplate, deleteTemplate, seedBaseTemplates, updateTemplate } from "./_lib/templates.js";

const RECENT_WINDOW = 7 * 24 * 60 * 60;

function routePath(request: Request): string[] {
  const url = new URL(request.url);
  // En Vercel llega por la reescritura de vercel.json (?__path=...); en desarrollo, por la URL directa.
  const raw = url.searchParams.get("__path") ?? url.pathname.replace(/^\/api\/?/, "");
  return raw.split("/").filter(Boolean).map(decodeURIComponent);
}

function todayParam(request: Request): string {
  const value = new URL(request.url).searchParams.get("today");
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
}

async function route(request: Request): Promise<Response> {
  const method = request.method;
  const [head, id, sub, ...rest] = routePath(request);
  if (rest.length) throw new HttpError(404, "Ruta no encontrada");
  if (method !== "GET") assertSameOrigin(request);

  // --- Autenticación (rutas públicas) ---
  if (head === "auth") {
    if (id === "login" && method === "POST") {
      const body = await readJson(request);
      if (typeof body.email !== "string" || typeof body.password !== "string" || !body.email || !body.password) {
        throw new HttpError(400, "Correo y contraseña son obligatorios");
      }
      const { user, cookie } = await login(request, body.email, body.password);
      return json({ user }, 200, { "Set-Cookie": cookie });
    }
    if (id === "logout" && method === "POST") {
      return noContent({ "Set-Cookie": await logout(request) });
    }
    if (id === "me" && method === "GET") {
      const user = await getSessionUser(request);
      if (!user) throw new HttpError(401, "Sesión no válida o expirada");
      return json({ user });
    }
  }

  // --- A partir de aquí todo requiere sesión ---
  const user = await requireUser(request);

  if (head === "auth") {
    if (id === "me" && method === "PATCH") {
      const body = await readJson(request);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 120) throw new HttpError(400, "El nombre debe tener entre 2 y 120 caracteres");
      await db().execute({ sql: "UPDATE users SET name = ? WHERE id = ?", args: [name, user.id] });
      return json({ user: { ...user, name } });
    }
    if (id === "password" && method === "POST") {
      const body = await readJson(request);
      if (typeof body.current !== "string" || typeof body.next !== "string") {
        throw new HttpError(400, "Faltan la contraseña actual o la nueva");
      }
      const cookie = await changePassword(request, user, body.current, body.next);
      return noContent({ "Set-Cookie": cookie });
    }
    throw new HttpError(404, "Ruta no encontrada");
  }

  if (head === "summary" && !id && method === "GET") {
    return json(await summary(todayParam(request), nowSeconds() - RECENT_WINDOW));
  }

  if (head === "projects") {
    if (!id) {
      if (method === "GET") return json(await listProjects());
      if (method === "POST") {
        const projectId = await createProject(await readJson(request), user.name);
        return json((await listProjects(projectId))[0], 201);
      }
    } else if (!sub) {
      if (method === "GET") {
        const [project] = await listProjects(id);
        if (!project) throw new HttpError(404, "Proyecto no encontrado");
        return json(project);
      }
      if (method === "PATCH") {
        await updateProject(id, await readJson(request));
        return json((await listProjects(id))[0]);
      }
      if (method === "DELETE") {
        await deleteProject(id);
        return noContent();
      }
    } else if (method === "GET") {
      if (sub === "documents") return json(await projectDocuments(id));
      if (sub === "stakeholders") return json(await projectStakeholders(id));
      if (sub === "requirements") return json(await projectRequirements(id));
      if (sub === "risks") return json(await projectRisks(id));
      if (sub === "kpis") return json(await projectKpis(id));
      if (sub === "sprints") return json(await projectSprints(id));
      if (sub === "tasks") return json(await projectTasks(id));
    }
    throw new HttpError(404, "Ruta no encontrada");
  }

  if (head === "templates" && !sub) {
    if (id === "seed" && method === "POST") return json(await seedBaseTemplates(), 201);
    if (!id && method === "POST") return json(await createTemplate(await readJson(request)), 201);
    if (id && method === "GET") {
      const template = await getTemplate(id);
      if (!template) throw new HttpError(404, "Plantilla no encontrada");
      return json(template);
    }
    if (id && method === "PATCH") {
      return json(await updateTemplate(id, await readJson(request)));
    }
    if (id && method === "DELETE") {
      await deleteTemplate(id);
      return noContent();
    }
  }

  if (head === "documents" && !sub) {
    if (id === "recent" && method === "GET") return json(await recentDocuments(nowSeconds() - RECENT_WINDOW));
    if (!id && method === "POST") {
      const result = await createDocument(await readJson(request));
      return json(result, result.created ? 201 : 200);
    }
    if (id && method === "GET") {
      const document = await getDocument(id);
      if (!document) throw new HttpError(404, "Documento no encontrado");
      return json(document);
    }
    if (id && method === "PATCH") {
      return json(await updateRecord(RESOURCES.documents, id, await readJson(request)));
    }
    if (id && method === "DELETE") {
      await deleteRecord(RESOURCES.documents, id);
      return noContent();
    }
  }

  // --- Imágenes en Cloudflare R2 ---
  // El navegador pide una URL prefirmada, sube el archivo directo a R2 y guarda el fileId.
  if (head === "uploads" && id === "presign" && !sub && method === "POST") {
    return json(await presignUpload(await readJson(request)));
  }

  if (head === "files" && id && !sub) {
    if (method === "GET") {
      const params = new URL(request.url).searchParams;
      const name = params.get("name") ?? undefined;
      return redirect(await presignDownload(id, name));
    }
    if (method === "DELETE") {
      await removeFile(id);
      return noContent();
    }
  }

  if (method === "GET" && !sub) {
    if (!id) {
      if (head === "reminders") return json(await listReminders());
      if (head === "notes") return json(await listNotes());
      if (head === "courses") return json(await listCourses());
      if (head === "templates") return json(await listTemplates());
    } else if (head === "notes") {
      const note = await getNote(id);
      if (!note) throw new HttpError(404, "Nota no encontrada");
      return json(note);
    } else if (head === "courses") {
      const course = await getCourse(id);
      if (!course) throw new HttpError(404, "Curso no encontrado");
      return json(course);
    }
  }

  const resource = Object.hasOwn(RESOURCES, head) ? RESOURCES[head] : undefined;
  if (resource && !sub) {
    if (!id && method === "POST") return json(await createRecord(resource, await readJson(request)), 201);
    if (id && method === "PATCH") return json(await updateRecord(resource, id, await readJson(request)));
    if (id && method === "DELETE") {
      await deleteRecord(resource, id);
      return noContent();
    }
  }

  throw new HttpError(404, "Ruta no encontrada");
}

export async function handle(request: Request): Promise<Response> {
  try {
    return await route(request);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (String(error).includes("UNIQUE constraint failed")) {
      return json({ error: "Ya existe un registro con esos datos (por ejemplo, una plantilla con el mismo nombre en esa fase)" }, 409);
    }
    console.error("[api]", error);
    return json({ error: "Error interno del servidor" }, 500);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
