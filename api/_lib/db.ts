import { createClient, type Client, type InValue, type Row } from "@libsql/client/web";

let client: Client | undefined;

export function db(): Client {
  if (!client) {
    const url = process.env.TURSO_URL;
    const authToken = process.env.TURSO_TOKEN;
    if (!url || !authToken) {
      throw new Error("Faltan las variables de entorno TURSO_URL y TURSO_TOKEN");
    }
    client = createClient({ url, authToken });
  }
  return client;
}

export async function all(sql: string, args: InValue[] = []): Promise<Row[]> {
  return (await db().execute({ sql, args })).rows;
}

export async function one(sql: string, args: InValue[] = []): Promise<Row | undefined> {
  return (await all(sql, args))[0];
}

export function str(value: unknown): string {
  return value == null ? "" : String(value);
}

export function optStr(value: unknown): string | null {
  return value == null || value === "" ? null : String(value);
}

export function num(value: unknown): number {
  return value == null ? 0 : Number(value);
}

/** Convierte los timestamps unix (segundos) de Turso a ISO 8601. */
export function iso(value: unknown): string {
  if (value == null) return "";
  return new Date(Number(value) * 1000).toISOString();
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
