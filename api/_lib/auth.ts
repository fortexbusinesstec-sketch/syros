import { createHash, randomBytes } from "node:crypto";
import { all, db, iso, nowSeconds, one, str } from "./db.js";
import { HttpError, clientIp, isHttps } from "./http.js";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password.js";

const COOKIE_NAME = "ph_session";
const SESSION_TTL = 7 * 24 * 60 * 60;
const MAX_FAILURES = 5;
const LOCKOUT_WINDOW = 15 * 60;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function sessionCookie(request: Request, value: string, maxAge: number): string {
  const secure = isHttps(request) ? "; Secure" : "";
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return null;
  const row = await one(
    `SELECT u.id, u.email, u.name, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > ?`,
    [hashToken(token), nowSeconds()],
  );
  if (!row) return null;
  return { id: str(row.id), email: str(row.email), name: str(row.name), created_at: iso(row.created_at) };
}

export async function requireUser(request: Request): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) throw new HttpError(401, "Sesión no válida o expirada");
  return user;
}

async function isLockedOut(keys: string[]): Promise<boolean> {
  const rows = await all(
    `SELECT failures FROM login_attempts WHERE key IN (${keys.map(() => "?").join(",")}) AND window_start > ?`,
    [...keys, nowSeconds() - LOCKOUT_WINDOW],
  );
  return rows.some((row) => Number(row.failures) >= MAX_FAILURES);
}

async function recordFailure(keys: string[]): Promise<void> {
  const now = nowSeconds();
  await db().batch(
    keys.map((key) => ({
      sql: `INSERT INTO login_attempts (key, failures, window_start) VALUES (?, 1, ?)
            ON CONFLICT(key) DO UPDATE SET
              failures = CASE WHEN window_start > ? THEN failures + 1 ELSE 1 END,
              window_start = CASE WHEN window_start > ? THEN window_start ELSE excluded.window_start END`,
      args: [key, now, now - LOCKOUT_WINDOW, now - LOCKOUT_WINDOW],
    })),
    "write",
  );
}

export async function login(
  request: Request,
  email: string,
  password: string,
): Promise<{ user: SessionUser; cookie: string }> {
  const normalized = email.trim().toLowerCase();
  const keys = [`ip:${clientIp(request)}`, `email:${normalized}`];

  if (await isLockedOut(keys)) {
    throw new HttpError(429, "Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.");
  }

  const row = await one("SELECT id, email, name, password_hash, created_at FROM users WHERE email = ?", [
    normalized,
  ]);
  // Se verifica siempre, aunque el usuario no exista, para no revelar qué correos son válidos por el tiempo de respuesta.
  const valid = await verifyPassword(password, row ? str(row.password_hash) : DUMMY_HASH);
  if (!row || !valid) {
    await recordFailure(keys);
    throw new HttpError(401, "Correo o contraseña incorrectos");
  }

  const token = randomBytes(32).toString("base64url");
  const now = nowSeconds();
  await db().batch(
    [
      { sql: "DELETE FROM sessions WHERE expires_at <= ?", args: [now] },
      { sql: `DELETE FROM login_attempts WHERE key IN (?, ?)`, args: keys },
      {
        sql: "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        args: [hashToken(token), str(row.id), now + SESSION_TTL, now],
      },
    ],
    "write",
  );

  return {
    user: { id: str(row.id), email: str(row.email), name: str(row.name), created_at: iso(row.created_at) },
    cookie: sessionCookie(request, token, SESSION_TTL),
  };
}

export async function logout(request: Request): Promise<string> {
  const token = readCookie(request, COOKIE_NAME);
  if (token) await db().execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [hashToken(token)] });
  return sessionCookie(request, "", 0);
}

export async function changePassword(
  request: Request,
  user: SessionUser,
  current: string,
  next: string,
): Promise<string> {
  const row = await one("SELECT password_hash FROM users WHERE id = ?", [user.id]);
  if (!row || !(await verifyPassword(current, str(row.password_hash)))) {
    throw new HttpError(400, "La contraseña actual no es correcta");
  }
  if (next.length < 10) throw new HttpError(400, "La nueva contraseña debe tener al menos 10 caracteres");

  // Cierra todas las sesiones y abre una nueva para este dispositivo.
  const token = randomBytes(32).toString("base64url");
  const now = nowSeconds();
  await db().batch(
    [
      { sql: "UPDATE users SET password_hash = ? WHERE id = ?", args: [await hashPassword(next), user.id] },
      { sql: "DELETE FROM sessions WHERE user_id = ?", args: [user.id] },
      {
        sql: "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        args: [hashToken(token), user.id, now + SESSION_TTL, now],
      },
    ],
    "write",
  );
  return sessionCookie(request, token, SESSION_TTL);
}
