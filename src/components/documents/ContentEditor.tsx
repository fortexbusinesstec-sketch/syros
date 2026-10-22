import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/common/StateMessage";
import type { TemplateFormat } from "@/types";

// Carga diferida: Tiptap, Mermaid y bpmn-js solo se descargan al abrir un documento.
const RichEditor = lazy(() => import("@/components/documents/RichEditor"));
const DiagramEditor = lazy(() => import("@/components/documents/DiagramEditor"));
const ImageEditor = lazy(() => import("@/components/documents/ImageEditor"));

interface ContentEditorProps {
  format: TemplateFormat;
  content: string;
  onContentChange: (content: string) => void;
  /**
   * JSON serializado de ImageDoc (o cadena vacía).
   * Solo se usa cuando format === "Diagrama BPMN" para ofrecer la segunda pestaña de imagen.
   */
  image?: string;
  onImageChange?: (image: string) => void;
  title: string;
}

export function ContentEditor({
  format,
  content,
  onContentChange,
  image = "",
  onImageChange,
  title,
}: ContentEditorProps) {
  return (
    <Suspense fallback={<LoadingState label="Cargando editor..." />}>
      {format === "Diagrama BPMN" ? (
        <DiagramEditor
          xml={content}
          onXmlChange={onContentChange}
          image={image}
          onImageChange={onImageChange ?? (() => {})}
          fileName={title}
        />
      ) : format === "Imagen" ? (
        <ImageEditor image={content} onChange={onContentChange} title={title} />
      ) : (
        <RichEditor markdown={content} onChange={onContentChange} title={title} />
      )}
    </Suspense>
  );
}
