import { useRef } from "react";
import FloatingSidebar, { type FloatingEditorRef } from "@/components/editor/floating-sidebar";
import LiveEditor, { type LiveEditorMethods } from "@/components/editor/live-editor";

interface RichEditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
  /** Título del PDF exportado. */
  title: string;
}

/** Editor de portal_propio (Tiptap + tablas + Mermaid) sobre una hoja blanca, también en modo oscuro. */
export default function RichEditor({ markdown, onChange, title }: RichEditorProps) {
  const editorRef = useRef<LiveEditorMethods>(null);

  return (
    <div className="relative">
      <FloatingSidebar
        editorRef={editorRef as React.RefObject<FloatingEditorRef | null>}
        printTitle={title}
      />
      <div className="document-paper overflow-hidden rounded-xl border border-border/80 bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <LiveEditor ref={editorRef} markdown={markdown} onChange={onChange} />
      </div>
    </div>
  );
}
