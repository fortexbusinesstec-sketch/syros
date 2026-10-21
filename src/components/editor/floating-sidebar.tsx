import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  Plus,
  Type,
  Code,
  Pi,
  GitBranch,
  Table2,
  Minus,
  FileText,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Play,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  StretchVertical,
  Focus,
  Square,
  CaseSensitive,
  ClipboardPaste,
  Copy,
  FileDown,
  Check,
  X,
} from "lucide-react";
import { Button } from "./ui";
import { cn } from "./cn";

export interface FloatingEditorRef {
  getMarkdown: () => string;
  insertMarkdown?: (md: string) => void;
  insertParsedMarkdown?: (md: string) => void;
  applyInlineFormat?: (type: "bold" | "italic" | "underline" | "strike") => void;
  applyAlignment?: (align: "left" | "center" | "right" | "justify") => void;
  applyLineHeight?: (lineHeight: string) => void;
  printDocument?: (title: string) => Promise<void>;
}

interface FloatingSidebarProps {
  editorRef: React.RefObject<FloatingEditorRef | null>;
  /** Título del PDF exportado (también es el nombre de archivo que sugiere el navegador). */
  printTitle?: string;
  onFormatAction?: (action: string) => void;
  onInsertAction?: (action: string) => void;
  onSave?: () => void;
  saving?: boolean;
  docMetadata?: {
    title: string;
    description: string;
    phase: number;
    created_at: string;
    updated_at: string;
  };
}

function MenuPanel({
  children,
  position,
  onClose,
  width = 250,
}: {
  children: React.ReactNode;
  position: { top: number; left: number };
  onClose: () => void;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(position.top);

  // Mantiene el panel dentro de la ventana: si no cabe hacia abajo, lo sube.
  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 0;
    setTop(Math.max(12, Math.min(position.top, window.innerHeight - height - 12)));
  }, [position.top]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 max-h-[80vh] overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 duration-150"
      style={{ top, left: Math.max(12, position.left), width }}
    >
      {children}
    </div>,
    document.body
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  className,
  style,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left",
        className
      )}
    >
      <Icon className="h-4 w-4 text-slate-400 shrink-0" />
      {label}
    </button>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {title}
      </div>
      {children}
    </div>
  );
}

function ColorDot({ color, onClick }: { color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-5 h-5 rounded-full border border-slate-200 hover:scale-125 transition-transform"
      style={{ backgroundColor: color }}
    />
  );
}

export default function FloatingSidebar({ editorRef, printTitle = "Documento" }: FloatingSidebarProps) {
  const [activeMenu, setActiveMenu] = useState<"insert" | "format" | null>(null);
  const [sidebarRect, setSidebarRect] = useState({ top: 100, left: 0 });
  const [mdModalOpen, setMdModalOpen] = useState(false);
  const [mdText, setMdText] = useState("");

  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sidebarRef.current) {
      const rect = sidebarRef.current.getBoundingClientRect();
      setSidebarRect({ top: rect.top, left: rect.left });
    }
  }, [activeMenu]);

  function handleInsert(action: string) {
    let insertion = "";
    switch (action) {
      case "text":
        insertion = "\n\n";
        break;
      case "code":
        insertion = "\n```javascript\n// código aquí\n```\n";
        break;
      case "formula":
        insertion = "\n$$\nE = mc^2\n$$\n";
        break;
      case "mermaid":
        insertion = '\n<div data-type="mermaid"></div>\n';
        break;
      case "table":
        insertion = '\n<div data-type="structured-table"></div>\n';
        break;
      case "table-simple":
        insertion = '\n<div data-type="simple-table"></div>\n';
        break;
      case "line-single":
        insertion = "\n---\n";
        break;
      case "line-double":
        insertion = "\n===\n";
        break;
      case "line-dotted":
        insertion = "\n***\n";
        break;
      case "line-dashed":
        insertion = "\n- - -\n";
        break;
      case "page-break":
        insertion = "\n<div style='page-break-after: always;'></div>\n";
        break;
    }
    if (insertion && editorRef.current) {
      (editorRef.current as { insertMarkdown?: (md: string) => void })?.insertMarkdown?.(insertion);
    }
    setActiveMenu(null);
  }

  function handleFormat(action: string) {
    const editor = editorRef.current;

    // Inline marks + alignment + line-height apply to the current selection
    switch (action) {
      case "bold":
        editor?.applyInlineFormat?.("bold");
        setActiveMenu(null);
        return;
      case "italic":
        editor?.applyInlineFormat?.("italic");
        setActiveMenu(null);
        return;
      case "underline":
        editor?.applyInlineFormat?.("underline");
        setActiveMenu(null);
        return;
      case "strikethrough":
        editor?.applyInlineFormat?.("strike");
        setActiveMenu(null);
        return;
      case "align-left":
        editor?.applyAlignment?.("left");
        setActiveMenu(null);
        return;
      case "align-center":
        editor?.applyAlignment?.("center");
        setActiveMenu(null);
        return;
      case "align-right":
        editor?.applyAlignment?.("right");
        setActiveMenu(null);
        return;
      case "align-justify":
        editor?.applyAlignment?.("justify");
        setActiveMenu(null);
        return;
      case "line-height-1":
        editor?.applyLineHeight?.("1");
        setActiveMenu(null);
        return;
      case "line-height-1.5":
        editor?.applyLineHeight?.("1.5");
        setActiveMenu(null);
        return;
      case "line-height-2":
        editor?.applyLineHeight?.("2");
        setActiveMenu(null);
        return;
    }

    let insertion = "";
    switch (action) {
      case "title":
        insertion = "\n# Título\n";
        break;
      case "subtitle":
        insertion = "\n## Subtítulo\n";
        break;
      case "heading":
        insertion = "\n### Encabezado\n";
        break;
      case "strong":
        insertion = "\n**Texto fuerte**\n";
        break;
      case "body":
        insertion = "\nTexto normal\n";
        break;
      case "quote":
        insertion = "\n> Leyenda\n";
        break;
      case "checkbox":
        insertion = "\n- [ ] Elemento\n";
        break;
      case "play-list":
        insertion = "\n- ▶ Elemento\n";
        break;
      case "bullet-list":
        insertion = "\n- Elemento\n";
        break;
      case "numbered-list":
        insertion = "\n1. Elemento\n";
        break;
      case "tab":
        insertion = "\t";
        break;
      case "focus":
        insertion = "\n> **Enfoque:** Texto destacado\n";
        break;
      case "block":
        insertion = "\n```\nBloque de código\n```\n";
        break;
    }
    if (insertion && editor) {
      editor.insertMarkdown?.(insertion);
    }
    setActiveMenu(null);
  }

  function handleInsertMarkdown() {
    const md = mdText.trim();
    if (md && editorRef.current) {
      (editorRef.current as { insertParsedMarkdown?: (md: string) => void })?.insertParsedMarkdown?.(md);
    }
    setMdText("");
    setMdModalOpen(false);
    setActiveMenu(null);
  }

  const [copied, setCopied] = useState(false);

  function handleCopyMarkdown() {
    const md = editorRef.current?.getMarkdown() || "";
    if (!md) {
      return;
    }
    navigator.clipboard
      .writeText(md)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  const [exporting, setExporting] = useState(false);

  function handleExportPdf() {
    if (exporting) return;
    setExporting(true);
    editorRef.current
      ?.printDocument?.(printTitle)
      .catch((error) => console.error("No se pudo exportar a PDF", error))
      .finally(() => setExporting(false));
  }

  const colors = [
    { name: "Blanco", value: "#ffffff" },
    { name: "Gris", value: "#6b7280" },
    { name: "Gris Claro", value: "#d1d5db" },
    { name: "Morado", value: "#8b5cf6" },
    { name: "Azul", value: "#3b82f6" },
    { name: "Celeste", value: "#06b6d4" },
    { name: "Verde", value: "#22c55e" },
    { name: "Rojo", value: "#ef4444" },
    { name: "Naranja", value: "#f97316" },
  ];

  const fonts = [
    { name: "Por defecto", value: "inherit" },
    { name: "Serif", value: "Georgia, serif" },
    { name: "Mono", value: "monospace" },
  ];

  return (
    <>
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="fixed right-4 top-[25%] z-[9998] flex flex-col gap-1.5 bg-white rounded-xl shadow-xl border border-slate-200 p-2"
      >
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-11 w-11 p-0 rounded-xl",
            activeMenu === "insert" && "bg-slate-100 text-slate-900"
          )}
          onClick={() => setActiveMenu(activeMenu === "insert" ? null : "insert")}
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-11 w-11 p-0 rounded-xl",
            activeMenu === "format" && "bg-slate-100 text-slate-900"
          )}
          onClick={() => setActiveMenu(activeMenu === "format" ? null : "format")}
        >
          <CaseSensitive className="h-5 w-5" />
        </Button>
        <div className="my-0.5 border-t border-slate-100" />
        <Button
          variant="ghost"
          size="sm"
          title="Copiar todo el Markdown"
          onClick={handleCopyMarkdown}
          className="h-11 w-11 p-0 rounded-xl"
        >
          {copied ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <Copy className="h-5 w-5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          title="Exportar a PDF"
          onClick={handleExportPdf}
          disabled={exporting}
          className="h-11 w-11 p-0 rounded-xl"
        >
          {exporting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <FileDown className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Insert Menu */}
      {activeMenu === "insert" && (
        <MenuPanel
          position={{ top: sidebarRect.top, left: sidebarRect.left - 260 }}
          onClose={() => setActiveMenu(null)}
        >
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-xs font-semibold text-slate-900">Insertar</p>
            <p className="text-[10px] text-slate-400">Arrastra y suelta cualquier elemento</p>
          </div>
          <MenuItem icon={Type} label="Texto" onClick={() => handleInsert("text")} />
          <MenuItem icon={Code} label="Bloque de Código" onClick={() => handleInsert("code")} />
          <MenuItem icon={Pi} label="Fórmula (TeX)" onClick={() => handleInsert("formula")} />
          <MenuItem icon={GitBranch} label="Diagrama Mermaid" onClick={() => handleInsert("mermaid")} />
          <MenuItem icon={Table2} label="Tabla" onClick={() => handleInsert("table")} />
          <MenuItem icon={Table2} label="Tabla Simple" onClick={() => handleInsert("table-simple")} />
          <MenuSection title="Insertar Línea">
            <MenuItem icon={Minus} label="Línea simple" onClick={() => handleInsert("line-single")} />
            <MenuItem icon={Minus} label="Línea doble" onClick={() => handleInsert("line-double")} />
            <MenuItem icon={Minus} label="Línea punteada" onClick={() => handleInsert("line-dotted")} />
            <MenuItem icon={Minus} label="Línea discontinua" onClick={() => handleInsert("line-dashed")} />
          </MenuSection>
          <MenuItem icon={FileText} label="Salto de página" onClick={() => handleInsert("page-break")} />
          <MenuItem
            icon={ClipboardPaste}
            label="Insertar por Markdown"
            onClick={() => {
              setActiveMenu(null);
              setMdModalOpen(true);
            }}
          />
        </MenuPanel>
      )}

      {/* Format Menu */}
      {activeMenu === "format" && (
        <MenuPanel
          position={{ top: sidebarRect.top, left: sidebarRect.left - 260 }}
          onClose={() => setActiveMenu(null)}
        >
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-xs font-semibold text-slate-900">Formato</p>
          </div>

          <MenuSection title="Texto">
            <div className="grid grid-cols-3 gap-1 px-2">
              <button type="button" onClick={() => handleFormat("title")} className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Type className="h-4 w-4 text-slate-400" />
                Título
              </button>
              <button type="button" onClick={() => handleFormat("subtitle")} className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Type className="h-4 w-4 text-slate-400" />
                Subtítulo
              </button>
              <button type="button" onClick={() => handleFormat("heading")} className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Type className="h-4 w-4 text-slate-400" />
                Encabez.
              </button>
              <button type="button" onClick={() => handleFormat("strong")} className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Bold className="h-4 w-4 text-slate-400" />
                Fuerte
              </button>
              <button type="button" onClick={() => handleFormat("body")} className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Type className="h-4 w-4 text-slate-400" />
                Cuerpo
              </button>
              <button type="button" onClick={() => handleFormat("quote")} className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Type className="h-4 w-4 text-slate-400" />
                Leyenda
              </button>
            </div>
          </MenuSection>

          <MenuSection title="Herramientas">
            <div className="grid grid-cols-4 gap-1 px-2">
              <button type="button" onClick={() => handleFormat("bold")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Negrita">
                <Bold className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => handleFormat("italic")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Cursiva">
                <Italic className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => handleFormat("underline")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Subrayado">
                <Underline className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => handleFormat("strikethrough")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Tachado">
                <Strikethrough className="h-4 w-4" />
              </button>
            </div>
          </MenuSection>

          <MenuSection title="Listas">
            <div className="grid grid-cols-4 gap-1 px-2">
              <button type="button" onClick={() => handleFormat("checkbox")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Checkbox">
                <CheckSquare className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => handleFormat("play-list")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Play">
                <Play className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => handleFormat("bullet-list")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Puntos">
                <List className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => handleFormat("numbered-list")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Números">
                <ListOrdered className="h-4 w-4" />
              </button>
            </div>
          </MenuSection>

          <MenuSection title="Alineación">
            <div className="grid grid-cols-4 gap-1 px-2">
              <button type="button" onClick={() => handleFormat("align-left")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Izquierda">
                <AlignLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => handleFormat("align-center")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Centro">
                <AlignCenter className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => handleFormat("align-right")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Derecha">
                <AlignRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => handleFormat("align-justify")} className="flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Justificado">
                <AlignJustify className="h-4 w-4" />
              </button>
            </div>
          </MenuSection>

          <MenuSection title="Interlineado">
            <div className="grid grid-cols-3 gap-1 px-2">
              <button type="button" onClick={() => handleFormat("line-height-1")} className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Interlineado simple">
                <StretchVertical className="h-4 w-4 text-slate-400" />
                1.0
              </button>
              <button type="button" onClick={() => handleFormat("line-height-1.5")} className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Interlineado 1.5">
                <StretchVertical className="h-4 w-4 text-slate-400" />
                1.5
              </button>
              <button type="button" onClick={() => handleFormat("line-height-2")} className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Interlineado doble">
                <StretchVertical className="h-4 w-4 text-slate-400" />
                2.0
              </button>
            </div>
          </MenuSection>

          <MenuSection title="Decoraciones">
            <div className="grid grid-cols-2 gap-1 px-2">
              <button type="button" onClick={() => handleFormat("focus")} className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Focus className="h-4 w-4 text-slate-400" />
                Enfoque
              </button>
              <button type="button" onClick={() => handleFormat("block")} className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Square className="h-4 w-4 text-slate-400" />
                Bloque
              </button>
            </div>
          </MenuSection>

          <MenuSection title="Color">
            <div className="flex flex-wrap gap-1.5 px-3 py-1">
              {colors.map((c) => (
                <ColorDot key={c.value} color={c.value} onClick={() => {}} />
              ))}
            </div>
          </MenuSection>

          <MenuSection title="Fuente">
            <div className="grid grid-cols-3 gap-1 px-2">
              {fonts.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {}}
                  className="flex flex-col items-center gap-1 p-2 text-[10px] text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  style={{ fontFamily: f.value }}
                >
                  <Type className="h-4 w-4 text-slate-400" />
                  {f.name}
                </button>
              ))}
            </div>
          </MenuSection>
        </MenuPanel>
      )}

      {/* Modal Insertar por Markdown */}
      {mdModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setMdModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Insertar por Markdown</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pega Markdown. Se insertará con la estructura del editor (títulos, subtítulos, listas y tablas simples).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMdModalOpen(false)}
                  className="inline-flex items-center justify-center size-7 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <textarea
                value={mdText}
                onChange={(e) => setMdText(e.target.value)}
                rows={12}
                autoFocus
                placeholder={`# Título\n\n## Subtítulo\n\n### Encabezado\n\n- Elemento de lista\n\n| Campo | Valor |\n|---|---|\n| Proyecto | [Nombre] |`}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono"
              />

              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" onClick={() => setMdModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleInsertMarkdown} disabled={!mdText.trim()}>
                  Insertar
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
