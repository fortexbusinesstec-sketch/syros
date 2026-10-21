import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt con N=2^15, r=8, p=1 (≈32 MB por hash). Formato: scrypt$N$r$p$salt$hash
const N = 32768;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;

function derive(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { N: n, r, p, maxmem: MAX_MEM }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P, KEY_LENGTH);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await derive(
    password,
    Buffer.from(saltB64, "base64"),
    Number(n),
    Number(r),
    Number(p),
    expected.length,
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash válido pero inútil, para gastar el mismo tiempo cuando el correo no existe. */
export const DUMMY_HASH =
  "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");
