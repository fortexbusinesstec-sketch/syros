import type { InValue } from "@libsql/client/web";
import { one } from "./db.js";
import { HttpError } from "./http.js";

export type FieldSpec =
  | { kind: "text"; max: number; required?: boolean }
  | { kind: "email"; required?: boolean }
  | { kind: "url"; required?: boolean }
  | { kind: "date"; required?: boolean }
  | { kind: "datetime"; required?: boolean }
  | { kind: "enum"; values: readonly string[]; required?: boolean }
  | { kind: "ref"; table: string; required?: boolean };

export type Schema = Record<string, FieldSpec>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(field: string, message: string): never {
  throw new HttpError(400, `${field}: ${message}`);
}

function isValidDate(value: string): boolean {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value.slice(0, 10);
}

async function checkField(field: string, spec: FieldSpec, raw: unknown): Promise<InValue> {
  if (raw === null || raw === undefined || raw === "") {
    if (spec.required) fail(field, "es obligatorio");
    return null;
  }
  if (typeof raw !== "string") fail(field, "debe ser texto");
  const value = raw.trim();
  if (!value && spec.required) fail(field, "es obligatorio");

  switch (spec.kind) {
    case "text":
      if (value.length > spec.max) fail(field, `máximo ${spec.max} caracteres`);
      return value || null;
    case "email":
      if (value.length > 254 || !EMAIL.test(value)) fail(field, "correo inválido");
      return value.toLowerCase();
    case "url": {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        fail(field, "URL inválida");
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") fail(field, "solo se permiten URLs http(s)");
      if (value.length > 2000) fail(field, "URL demasiado larga");
      return value;
    }
    case "date":
      if (!DATE.test(value) || !isValidDate(value)) fail(field, "fecha inválida (YYYY-MM-DD)");
      return value;
    case "datetime":
      if (!DATETIME.test(value) || !isValidDate(value)) fail(field, "fecha inválida (YYYY-MM-DD HH:MM)");
      return value;
    case "enum":
      if (!spec.values.includes(value)) fail(field, `debe ser uno de: ${spec.values.join(", ")}`);
      return value;
    case "ref":
      if (!(await one(`SELECT 1 FROM ${spec.table} WHERE id = ?`, [value]))) fail(field, "no existe");
      return value;
  }
}

/**
 * Valida el cuerpo contra el esquema. Solo devuelve columnas declaradas en el esquema,
 * así los nombres de columna nunca vienen del cliente. Con `partial` solo valida las claves presentes.
 */
export async function validate(
  body: Record<string, unknown>,
  schema: Schema,
  partial = false,
): Promise<Record<string, InValue>> {
  const result: Record<string, InValue> = {};
  for (const [field, spec] of Object.entries(schema)) {
    if (partial && !(field in body)) continue;
    result[field] = await checkField(field, spec, body[field]);
  }
  return result;
}

export function stringList(raw: unknown, field: string, maxItems = 20, maxLength = 60): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) fail(field, "debe ser una lista");
  if (raw.length > maxItems) fail(field, `máximo ${maxItems} elementos`);
  const values = raw.map((item) => {
    if (typeof item !== "string") fail(field, "cada elemento debe ser texto");
    const value = item.trim();
    if (value.length > maxLength) fail(field, `máximo ${maxLength} caracteres por elemento`);
    return value;
  });
  return [...new Set(values.filter(Boolean))];
}
