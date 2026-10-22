// Almacenamiento de imágenes en Cloudflare R2 (API compatible con S3).
// El navegador sube el archivo directamente a R2 con una URL prefirmada, así la
// imagen no pasa por el body de la función serverless (límite de 4,5 MB en Vercel).
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HttpError } from "./http.js";

/** Prefijo dentro del bucket: solo lo que sube la aplicación vive aquí. */
export const FILE_PREFIX = "diagramas";

/** Tipos admitidos como diagrama y extensión con la que se guardan en el bucket. */
export const CONTENT_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

/** Tope por archivo. R2 no lo impone, pero evita subir accidentalmente vídeos enormous. */
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

const FILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/;

interface R2Config {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}

let client: S3Client | null = null;

export function r2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new HttpError(
      503,
      "El almacenamiento de imágenes no está configurado: faltan las variables R2_* del servidor.",
    );
  }
  const endpoint = (process.env.R2_S3_API || `https://${accountId}.r2.cloudflarestorage.com`).replace(/\/+$/, "");
  const publicUrl = (process.env.R2_PUBLIC_URL || `${endpoint}/${bucket}`).replace(/\/+$/, "");
  return { bucket, endpoint, accessKeyId, secretAccessKey, publicUrl };
}

function s3(): S3Client {
  if (!client) {
    const { endpoint, accessKeyId, secretAccessKey } = r2Config();
    client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

function keyOf(fileId: string): string {
  if (!FILE_ID.test(fileId)) throw new HttpError(400, "Identificador de archivo no válido");
  return `${FILE_PREFIX}/${fileId}`;
}

export interface UploadTicket {
  /** Identificador del archivo. Es lo que se guarda en el documento. */
  fileId: string;
  /** URL prefirmada para hacer PUT con el binario. */
  url: string;
  /** URL pública del bucket (solo informative; puede estar deshabilitada). */
  publicUrl: string;
}

/**
 * Prepara la subida: valida el tipo y el tamaño, y devuelve una URL prefirmada.
 * El cliente hace PUT a `url` y luego guarda `fileId` en el documento.
 */
export async function presignUpload(body: Record<string, unknown>): Promise<UploadTicket> {
  const { bucket } = r2Config();
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const extension = CONTENT_TYPES[contentType];
  if (!extension) {
    throw new HttpError(415, `Formato no admitido. Usa: ${Object.keys(CONTENT_TYPES).join(", ")}.`);
  }
  const size = Number(body.size);
  if (!Number.isFinite(size) || size <= 0) throw new HttpError(400, "El tamaño del archivo no es válido");
  if (size > MAX_FILE_BYTES) {
    throw new HttpError(413, `El archivo supera el máximo de ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB`);
  }

  const fileId = `${crypto.randomUUID()}${extension}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: keyOf(fileId),
    ContentType: contentType,
    ContentLength: size,
  });
  const url = await getSignedUrl(s3(), command, { expiresIn: 900 });
  return { fileId, url, publicUrl: `${r2Config().publicUrl}/${FILE_PREFIX}/${fileId}` };
}

/** URL prefirmada de lectura. Caduca en 10 minutos, por eso la API la renueva en cada petición. */
export async function presignDownload(fileId: string, fileName?: string): Promise<string> {
  const { bucket } = r2Config();
  const safeName = (fileName || "diagrama").replace(/[^\w.\- ]/g, "-").slice(0, 80) || "diagrama";
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: keyOf(fileId),
    ...(fileName ? { ResponseContentDisposition: `attachment; filename="${safeName}"` } : {}),
  });
  return getSignedUrl(s3(), command, { expiresIn: 600 });
}

export async function removeFile(fileId: string): Promise<void> {
  const { bucket } = r2Config();
  await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: keyOf(fileId) }));
}
