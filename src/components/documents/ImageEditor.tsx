import { useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, DragEvent } from "react";
import { Button } from "@heroui/react";
import {
  CircleAlert,
  Download,
  FileImage,
  ImagePlus,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  IMAGE_CONTENT_TYPES,
  MAX_IMAGE_BYTES,
  formatBytes,
  imageUrl,
  parseImageDoc,
  serializeImageDoc,
} from "@/lib/image-doc";
import { cn } from "@/lib/utils";

interface ImageEditorProps {
  content: string;
  onChange: (content: string) => void;
  title: string;
}

interface UploadTicket {
  fileId: string;
  url: string;
}

/**
 * Editor de los documentos de tipo "Imagen": el diagrama (AS-IS / TO-BE) llega como
 * archivo y se guarda en Cloudflare R2. El navegador sube el binario directo a R2
 * con una URL prefirmada, así el archivo no pasa por la API.
 */
export function ImageEditor({ content, onChange, title }: ImageEditorProps) {  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const current = parseImageDoc(content);

  const upload = async (file: File) => {
    setError("");
    if (!IMAGE_CONTENT_TYPES.includes(file.type as (typeof IMAGE_CONTENT_TYPES)[number])) {
      setError("Formato no admitido. Usa PNG, JPG, WEBP, GIF o SVG.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`El archivo supera el máximo de ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    setUploading(true);
    const previous = current;
    try {
      const ticket = await apiFetch<UploadTicket>("/uploads/presign", {
        method: "POST",
        body: { name: file.name, contentType: file.type, size: file.size },
      });
      const response = await fetch(ticket.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new ApiError(response.status, "Cloudflare R2 rechazó la subida.");
      onChange(
        serializeImageDoc({
          fileId: ticket.fileId,
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      );
      // El archivo anterior ya no se usa: lo borramos del bucket.
      if (previous) void apiFetch(`/files/${encodeURIComponent(previous.fileId)}`, { method: "DELETE" });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "No se pudo subir la imagen. Revisa que el bucket de R2 tenga CORS habilitado.",
      );
    } finally {
      setUploading(false);
    }
  };

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void upload(file);
  };

  const drop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  const paste = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = Array.from(event.clipboardData.files)[0];
    if (file) {
      event.preventDefault();
      void upload(file);
    }
  };

  const remove = async () => {
    if (!current) return;
    const removed = current;
    onChange("");
    try {
      await apiFetch(`/files/${encodeURIComponent(removed.fileId)}`, { method: "DELETE" });
    } catch {
      // El documento ya no la referencia: que el borrado en R2 no bloquee nada.
    }
  };

  return (
    <div
      tabIndex={0}
      onPaste={paste}
      className="rounded-xl border border-border/80 bg-surface focus:outline-none"
    >
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_CONTENT_TYPES.join(",")}
        className="hidden"
        onChange={pick}
      />

      {current ? (
        <div className="flex flex-col gap-3 p-3">
          <div className="overflow-hidden rounded-lg border border-border/70 bg-surface-secondary">
            <img
              src={imageUrl(current.fileId)}
              alt={current.name}
              className="max-h-[70vh] w-full bg-white object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium">{current.name}</p>
              <p className="text-[10px] text-muted">
                {formatBytes(current.size)} · {current.contentType.replace("image/", "").toUpperCase()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onPress={() => inputRef.current?.click()}
                className="h-8 gap-1.5 rounded-lg text-[10.5px]"
              >
                <Upload className="size-3.5" />
                Reemplazar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => window.open(imageUrl(current.fileId, true), "_blank")}
                className="h-8 gap-1.5 rounded-lg text-[10.5px]"
              >
                <Download className="size-3.5" />
                Descargar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => void remove()}
                className="h-8 gap-1.5 rounded-lg text-[10.5px] text-muted hover:text-danger"
              >
                <Trash2 className="size-3.5" />
                Quitar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl px-6 py-14 text-center transition-colors",
            dragging ? "bg-brand-soft" : "hover:bg-surface-secondary",
          )}
        >
          {uploading ? (
            <LoaderCircle className="size-6 animate-spin text-brand" />
          ) : (
            <ImagePlus className="size-6 text-muted" />
          )}
          <span className="text-[12.5px] font-medium">
            {uploading ? "Subiendo a Cloudflare..." : "Arrastra el diagrama aquí o haz clic para elegirlo"}
          </span>
          <span className="text-[10.5px] text-muted">
            PNG, JPG, WEBP, GIF o SVG · hasta {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB · también puedes
            pegar con Ctrl+V
          </span>
          <span className="text-[10px] text-muted/80">{title}</span>
        </button>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-1.5 border-t border-border/70 px-3 py-2 text-[10.5px] text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {uploading && current && (
        <p className="flex items-center gap-1.5 border-t border-border/70 px-3 py-2 text-[10.5px] text-muted">
          <LoaderCircle className="size-3.5 animate-spin" />
          Subiendo...
        </p>
      )}

      {!current && !error && !uploading && (
        <p className="flex items-center gap-1.5 border-t border-border/70 px-3 py-2 text-[10px] text-muted">
          <FileImage className="size-3.5 shrink-0" />
          El archivo se guarda en tu bucket de Cloudflare R2; el documento solo guarda su referencia.
        </p>
      )}
    </div>
  );
}

export default ImageEditor;
