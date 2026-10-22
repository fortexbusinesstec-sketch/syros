export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Documentos con tablas y diagramas BPMN pueden pesar bastante; Vercel admite hasta 4,5 MB.
const MAX_BODY_BYTES = 3_000_000;

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
  new Headers(headers).forEach((value, key) => response.headers.append(key, value));
  return response;
}

export function noContent(headers: HeadersInit = {}): Response {
  const response = new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  new Headers(headers).forEach((value, key) => response.headers.append(key, value));
  return response;
}

/** Redirección temporal: la usamos para mandar al cliente a la URL prefirmada de R2. */
export function redirect(location: string, headers: HeadersInit = {}): Response {
  const response = new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "private, max-age=60" },
  });
  new Headers(headers).forEach((value, key) => response.headers.append(key, value));
  return response;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new HttpError(415, "El cuerpo debe ser JSON");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "El cuerpo es demasiado grande");
  try {
    const parsed: unknown = JSON.parse(text || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "JSON inválido");
  }
}

/** Rechaza peticiones de escritura que vengan de otro origen (defensa CSRF adicional a SameSite). */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host || new URL(origin).host !== host) {
    throw new HttpError(403, "Origen no permitido");
  }
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function isHttps(request: Request): boolean {
  return (
    request.headers.get("x-forwarded-proto") === "https" ||
    new URL(request.url).protocol === "https:"
  );
}
