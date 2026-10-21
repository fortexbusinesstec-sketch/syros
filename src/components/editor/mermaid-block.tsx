import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { cn } from "./cn";
import { GitBranch, Pencil } from "lucide-react";
import "./mermaid-block.css";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
});

interface MermaidBlockProps {
  code: string;
  onChange?: (code: string) => void;
  isEditable?: boolean;
  selected?: boolean;
}

export default function MermaidBlock({
  code,
  onChange,
  isEditable = true,
  selected = false,
}: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCode, setShowCode] = useState(false);
  const [draft, setDraft] = useState(code);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEmpty = !code.trim();

  // Render the diagram whenever the code changes (and we are not editing).
  // A fresh id per render avoids mermaid removing the currently displayed SVG
  // (which would leave React's DOM out of sync and blank the diagram).
  useEffect(() => {
    if (isEmpty || showCode) return;
    let cancelled = false;
    const safeId = `mermaid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    mermaid
      .render(safeId, code)
      .then(({ svg: rendered }) => {
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvg("");
          setError("Error al renderizar el diagrama. Verifica la sintaxis.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, isEmpty, showCode]);

  const commitAndClose = () => {
    if (draft !== code) onChange?.(draft);
    setShowCode(false);
  };

  // Exit code mode when clicking outside the block.
  useEffect(() => {
    if (!showCode) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commitAndClose();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCode, draft, code]);

  const enterCodeMode = () => {
    if (!isEditable) return;
    setDraft(code);
    setShowCode(true);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "mermaid-block relative my-3 rounded-xl border border-slate-200 bg-white overflow-hidden",
        selected && "ring-2 ring-blue-400"
      )}
    >
      {showCode ? (
        <div>
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 bg-slate-50">
            <GitBranch className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Mermaid — código fuente</span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitAndClose}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") commitAndClose();
            }}
            autoFocus
            spellCheck={false}
            placeholder="graph TD; A[Inicio] --> B[Fin]"
            className="w-full min-h-[160px] px-3 py-2 text-[13px] font-mono text-slate-800 focus:outline-none resize-y bg-white"
          />
        </div>
      ) : isEmpty ? (
        <button
          type="button"
          onClick={enterCodeMode}
          disabled={!isEditable}
          className="w-full flex flex-col items-center justify-center gap-1.5 py-10 text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <GitBranch className="h-6 w-6" />
          <span className="text-sm">No mermaid diagram to show</span>
          {isEditable && <span className="text-xs text-slate-300">Haz clic para agregar código</span>}
        </button>
      ) : error ? (
        <button
          type="button"
          onClick={enterCodeMode}
          className="w-full flex flex-col gap-0.5 text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <span className="font-medium">Error al renderizar el diagrama.</span>
          <span className="text-xs text-red-400">Verifica la sintaxis (clic para editar).</span>
        </button>
      ) : (
        <div className="group/diagram relative">
          <div
            className="mermaid-diagram p-4 flex justify-center overflow-x-auto cursor-pointer"
            onClick={enterCodeMode}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          {isEditable && (
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/diagram:opacity-100 transition-opacity pointer-events-none">
              <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-white/90 rounded px-1.5 py-0.5 border border-slate-200">
                <Pencil className="h-3 w-3" /> Editar
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
