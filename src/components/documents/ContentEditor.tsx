import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/common/StateMessage";
import type { TemplateFormat } from "@/types";

// Carga diferida: Tiptap, Mermaid y bpmn-js solo se descargan al abrir un documento.
const RichEditor = lazy(() => import("@/components/documents/RichEditor"));
const BpmnEditor = lazy(() => import("@/components/documents/BpmnEditor"));

interface ContentEditorProps {
  format: TemplateFormat;
  content: string;
  onChange: (content: string) => void;
  title: string;
}

export function ContentEditor({ format, content, onChange, title }: ContentEditorProps) {
  return (
    <Suspense fallback={<LoadingState label="Cargando editor..." />}>
      {format === "Diagrama BPMN" ? (
        <BpmnEditor xml={content} onChange={onChange} fileName={title} />
      ) : (
        <RichEditor markdown={content} onChange={onChange} title={title} />
      )}
    </Suspense>
  );
}
