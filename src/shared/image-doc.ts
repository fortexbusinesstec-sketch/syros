// Formato compartido (frontend + API) para los documentos con imagen adjunta.
// El documento no guarda el archivo (vive en Cloudflare R2) sino su identificador.

export interface ImageDoc {
  /** Identificador del objeto en R2; con él se reconstruye la URL de lectura. */
  fileId: string;
  /** Nombre original, para mostrarlo y descargarlo. */
  name: string;
  size: number;
  contentType: string;
}

/** Tipos que acepta el servidor (mismo listado en api/_lib/r2.ts). */
export const IMAGE_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function imageUrl(fileId: string, download = false): string {
  const params = download ? "?download=1" : "";
  return `/api/files/${encodeURIComponent(fileId)}${params}`;
}

/** Lee el contenido de imagen de un documento. Devuelve null si no hay imagen o el formato no es válido. */
export function parseImageDoc(content: string): ImageDoc | null {
  if (!content) return null;
  try {
    const parsed: unknown = JSON.parse(content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const candidate = parsed as Partial<ImageDoc>;
    if (typeof candidate.fileId !== "string" || !candidate.fileId) return null;
    return {
      fileId: candidate.fileId,
      name: typeof candidate.name === "string" ? candidate.name : "diagrama",
      size: typeof candidate.size === "number" ? candidate.size : 0,
      contentType: typeof candidate.contentType === "string" ? candidate.contentType : "image/png",
    };
  } catch {
    return null;
  }
}

export function serializeImageDoc(doc: ImageDoc): string {
  return JSON.stringify(doc);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
