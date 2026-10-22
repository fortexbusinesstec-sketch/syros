import { lazy, Suspense, useState } from "react";
import { ImageDown, Route } from "lucide-react";
import { LoadingState } from "@/components/common/StateMessage";
import { cn } from "@/lib/utils";

// Carga diferida: bpmn-js y el editor de imagen solo se descargan al abrirlos.
const BpmnEditor = lazy(() => import("@/components/documents/BpmnEditor"));
const ImageEditor = lazy(() => import("@/components/documents/ImageEditor"));

type Tab = "modelo" | "imagen";

interface DiagramEditorProps {
  /** XML BPMN del modelo. */
  xml: string;
  onXmlChange: (xml: string) => void;
  /** JSON serializado de ImageDoc (o cadena vacía si no hay imagen adjunta). */
  image: string;
  onImageChange: (image: string) => void;
  /** Nombre base para descargas y textos de ayuda. */
  fileName: string;
}

/**
 * Editor combinado para documentos "Diagrama BPMN" de tipo AS-IS / TO-BE.
 * Ofrece dos pestañas:
 *  – Modelo  → BpmnEditor (XML BPMN editable con bpmn-js)
 *  – Imagen  → ImageEditor (imagen de referencia subida a Cloudflare R2)
 */
export function DiagramEditor({ xml, onXmlChange, image, onImageChange, fileName }: DiagramEditorProps) {
  const [tab, setTab] = useState<Tab>("modelo");

  return (
    <div className="flex flex-col gap-0">
      {/* Barra de pestañas */}
      <div className="flex items-center gap-0 border-b border-border/80 bg-surface">
        <TabButton
          active={tab === "modelo"}
          onClick={() => setTab("modelo")}
          icon={<Route className="size-3.5" />}
          label="Modelo"
        />
        <TabButton
          active={tab === "imagen"}
          onClick={() => setTab("imagen")}
          icon={<ImageDown className="size-3.5" />}
          label="Imagen"
          badge={image ? "●" : undefined}
        />
      </div>

      {/* Paneles — ambos se montan, solo uno es visible, así bpmn-js conserva su estado */}
      <div className={tab === "modelo" ? "block" : "hidden"}>
        <Suspense fallback={<LoadingState label="Cargando editor BPMN..." />}>
          <BpmnEditor xml={xml} onChange={onXmlChange} fileName={fileName} />
        </Suspense>
      </div>

      <div className={tab === "imagen" ? "block" : "hidden"}>
        <Suspense fallback={<LoadingState label="Cargando editor de imagen..." />}>
          <ImageEditor image={image} onChange={onImageChange} title={fileName} />
        </Suspense>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-3 py-2 text-[11.5px] font-medium transition-colors",
        active
          ? "border-brand text-brand"
          : "border-transparent text-muted hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {badge && (
        <span className="text-[8px] leading-none text-brand">{badge}</span>
      )}
    </button>
  );
}

export default DiagramEditor;
