// Crea o actualiza el usuario de acceso.
// Uso (PowerShell): $env:PH_PASSWORD = '...'; npm run db:user -- correo@dominio.com "Nombre Apellido"
// La contraseña se lee de PH_PASSWORD para que no quede en el historial de argumentos.
import { createClient } from "@libsql/client/web";
import { hashPassword } from "../api/_lib/password.ts";

try {
  process.loadEnvFile(".env");
} catch {
  // En CI/Vercel las variables ya vienen del entorno.
}

const [email, name] = process.argv.slice(2);
const password = process.env.PH_PASSWORD;

if (!email || !name || !password) {
  console.error('Uso: PH_PASSWORD=... node scripts/create-user.mjs <correo> "<nombre>"');
  process.exit(1);
}

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN });
const normalized = email.trim().toLowerCase();

await db.batch(
  [
    {
      sql: `INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash`,
      args: [crypto.randomUUID(), normalized, name.trim(), await hashPassword(password)],
    },
    // Al cambiar la contraseña se cierran todas las sesiones abiertas.
    { sql: "DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ?)", args: [normalized] },
  ],
  "write",
);

console.log(`Usuario listo: ${normalized}`);
db.close();
