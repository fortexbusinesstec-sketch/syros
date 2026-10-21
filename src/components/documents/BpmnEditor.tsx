import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@heroui/react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import {
  Download,
  FileUp,
  ImageDown,
  Info,
  Maximize,
  Maximize2,
  Paintbrush,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import BpmnAiModal from "@/components/documents/BpmnAiModal";
import { sanitizeAndPrepareBpmn } from "@/lib/bpmn-helper";
import { cn } from "@/lib/utils";

interface BpmnEditorProps {
  xml: string;
  onChange: (xml: string) => void;
  /** Nombre base para los archivos descargados. */
  fileName: string;
}

function download(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim() || "diagrama";
}

const COLOR_PRESETS = [
  {
    name: "Azul Syros (Estándar)",
    stroke: "#0066cc",
    fill: "#f0f7ff",
    badge: "bg-[#0066cc]",
  },
  {
    name: "Verde (TO-BE / Optimizado)",
    stroke: "#059669",
    fill: "#ecfdf5",
    badge: "bg-emerald-600",
  },
  {
    name: "Ámbar (AS-IS / Espera / Alerta)",
    stroke: "#d97706",
    fill: "#fffbeb",
    badge: "bg-amber-500",
  },
  {
    name: "Rojo (AS-IS / Cuello de Botella)",
    stroke: "#dc2626",
    fill: "#fef2f2",
    badge: "bg-red-600",
  },
  {
    name: "Púrpura (IA / Automatización)",
    stroke: "#7c3aed",
    fill: "#f5f3ff",
    badge: "bg-purple-600",
  },
];

export default function BpmnEditor({ xml, onChange, fileName }: BpmnEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const onChangeRef = useRef(onChange);
  const lastXml = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [colorHint, setColorHint] = useState("");
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [hasSelectedTask, setHasSelectedTask] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const modeler = new BpmnModeler({
      container: containerRef.current!,
      textRenderer: {
        defaultStyle: {
          fontFamily: '"Montserrat", ui-sans-serif, system-ui, sans-serif',
        },
      },
    });
    modelerRef.current = modeler;
    lastXml.current = null;

    const eventBus = modeler.get("eventBus") as {
      on: (event: string, priority: number, fn: (context: Record<string, unknown>) => unknown) => void;
    };

    const isTaskElement = (shape: unknown): boolean => {
      if (!shape || typeof shape !== "object") return false;
      const candidate = shape as {
        type?: string;
        businessObject?: { $type?: string };
      };
      const type = candidate.businessObject?.$type || candidate.type || "";
      return (
        type.includes("Task") ||
        type.endsWith("Activity") ||
        type === "bpmn:Task" ||
        type === "bpmn:UserTask" ||
        type === "bpmn:ServiceTask" ||
        type === "bpmn:SendTask" ||
        type === "bpmn:ReceiveTask" ||
        type === "bpmn:ManualTask" ||
        type === "bpmn:BusinessRuleTask" ||
        type === "bpmn:ScriptTask" ||
        type === "bpmn:CallActivity"
      );
    };

    // Permitir redimensionar tareas para que los textos largos quepan cómodamente
    eventBus.on("shape.resize", 1500, (context) => {
      if (isTaskElement(context.shape)) {
        const newBounds = context.newBounds as { width?: number; height?: number } | undefined;
        if (newBounds && newBounds.width !== undefined && newBounds.height !== undefined) {
          return newBounds.width >= 80 && newBounds.height >= 40;
        }
        return true; // Habilita los 8 puntos de redimensionamiento
      }
    });

    eventBus.on("resize.start", 1500, (context) => {
      const ctx = (context.context || context) as {
        shape?: unknown;
        minDimensions?: { width: number; height: number };
      };
      if (isTaskElement(ctx.shape)) {
        ctx.minDimensions = { width: 80, height: 40 };
      }
    });

    eventBus.on("commandStack.shape.resize.canExecute", 1500, (context) => {
      const nested = context.context as
        | { shape?: unknown; newBounds?: { width?: number; height?: number } }
        | undefined;
      if (isTaskElement(nested?.shape)) {
        if (
          nested?.newBounds &&
          nested.newBounds.width !== undefined &&
          nested.newBounds.height !== undefined
        ) {
          return nested.newBounds.width >= 80 && nested.newBounds.height >= 40;
        }
        return true;
      }
    });

    // Escuchar selección para la barra de colores y detección de tareas
    modeler.on("selection.changed", (event: { newSelection?: unknown[] }) => {
      const selection = event.newSelection ?? [];
      setSelectedCount(selection.length);
      const containsTask = selection.some((shape) => isTaskElement(shape));
      setHasSelectedTask(containsTask);
    });

    modeler.on("commandStack.changed", async () => {
      try {
        const { xml: updated } = await modeler.saveXML({ format: true });
        if (updated) {
          lastXml.current = updated;
          onChangeRef.current(updated);
        }
      } catch (caught) {
        console.error("No se pudo serializar el diagrama", caught);
      }
    });

    return () => {
      modeler.destroy();
      modelerRef.current = null;
    };
  }, []);

  // Carga el XML recibido, salvo que sea el que acaba de emitir el propio modelador.
  useEffect(() => {
    const modeler = modelerRef.current;
    if (!modeler || xml === lastXml.current) return;
    lastXml.current = xml;

    const isCurrent = () => modelerRef.current === modeler;
    modeler
      .importXML(xml)
      .then(() => {
        if (!isCurrent()) return;
        setError("");
        const canvas = modeler.get("canvas") as {
          zoom: (level: string) => void;
          scroll: (delta: { dx: number; dy: number }) => void;
        };
        canvas.zoom("fit-viewport");
        canvas.scroll({ dx: 24, dy: 0 });
      })
      .catch((caught: unknown) => {
        if (!isCurrent()) return;
        setError(
          `No se pudo abrir el diagrama: ${caught instanceof Error ? caught.message : String(caught)}`,
        );
      });
  }, [xml]);

  const fitView = () => {
    const canvas = modelerRef.current?.get("canvas") as
      | {
          zoom: (level: string) => void;
          scroll: (delta: { dx: number; dy: number }) => void;
        }
      | undefined;
    if (!canvas) return;

    canvas.zoom("fit-viewport");
    // Desplazamiento horizontal para que los encabezados de carriles nunca queden pegados al borde
    canvas.scroll({ dx: 24, dy: 0 });
  };

  const autoFitSelectedTask = () => {
    const modeler = modelerRef.current;
    if (!modeler) return;
    const selectionService = modeler.get("selection") as { get: () => unknown[] };
    const selected = selectionService.get();
    if (!selected || !selected.length) return;

    const modelingService = modeler.get("modeling") as {
      resizeShape: (
        element: unknown,
        newBounds: { x: number; y: number; width: number; height: number },
      ) => void;
    };

    selected.forEach((element) => {
      const el = element as {
        x: number;
        y: number;
        width: number;
        height: number;
        businessObject?: { name?: string };
      };
      const name = el.businessObject?.name || "";
      const len = name.length;
      const targetWidth = Math.min(260, Math.max(145, Math.round(len * 2.8)));
      const targetHeight = Math.min(150, Math.max(85, Math.ceil(len / 22) * 20 + 40));

      modelingService.resizeShape(el, {
        x: el.x,
        y: el.y,
        width: targetWidth,
        height: targetHeight,
      });
    });
  };

  const exportBpmn = async () => {
    const result = await modelerRef.current?.saveXML({ format: true });
    if (result?.xml) download(result.xml, `${safeFileName(fileName)}.bpmn`, "application/xml");
  };

  const exportSvg = async () => {
    const result = await modelerRef.current?.saveSVG();
    if (result?.svg) download(result.svg, `${safeFileName(fileName)}.svg`, "image/svg+xml");
  };

  const loadBpmnXml = async (rawText: string) => {
    if (!modelerRef.current) return;
    setError("");
    setSuccessNotice("");

    try {
      const { xml: cleanXml, autoGeneratedDiagram } = sanitizeAndPrepareBpmn(rawText);
      await modelerRef.current.importXML(cleanXml);
      fitView();

      if (autoGeneratedDiagram) {
        setSuccessNotice(
          "Diagrama importado con éxito. Se autogeneró la distribución visual ya que el XML original no contenía coordenadas.",
        );
      } else {
        setSuccessNotice("Diagrama BPMN 2.0 importado y renderizado con éxito.");
      }

      setTimeout(() => setSuccessNotice(""), 5000);

      const { xml: imported } = await modelerRef.current.saveXML({ format: true });
      if (imported) {
        lastXml.current = imported;
        onChangeRef.current(imported);
      }
    } catch (caught) {
      setError(
        `Error al importar BPMN 2.0: ${caught instanceof Error ? caught.message : String(caught)}. Abre el "Asistente IA" para consultar las instrucciones y generar XML 100% compatible.`,
      );
    }
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    await loadBpmnXml(text);
  };

  const applyColor = (color?: { stroke: string; fill: string }) => {
    const modeler = modelerRef.current;
    if (!modeler) return;

    const selectionService = modeler.get("selection") as { get: () => unknown[] };
    const selected = selectionService.get();

    if (!selected || !selected.length) {
      setColorHint("Haz clic en una tarea, compuerta o evento en el diagrama antes de aplicar color.");
      setTimeout(() => setColorHint(""), 4000);
      return;
    }

    const modelingService = modeler.get("modeling") as {
      setColor: (elements: unknown[], colors: { stroke?: string; fill?: string }) => void;
    };

    if (color) {
      modelingService.setColor(selected, { stroke: color.stroke, fill: color.fill });
    } else {
      modelingService.setColor(selected, { stroke: "#22242a", fill: "#ffffff" });
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-surface shadow-xs">
      {/* Barra superior de herramientas */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/70 px-3 py-2 bg-surface">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Colapsar/Expandir Paleta */}
          <Button
            size="sm"
            variant="ghost"
            onPress={() => setIsPaletteCollapsed((prev) => !prev)}
            className="h-8 gap-1.5 rounded-lg text-[11px]"
            aria-label={isPaletteCollapsed ? "Mostrar paleta de herramientas" : "Colapsar paleta"}
          >
            {isPaletteCollapsed ? (
              <PanelLeftOpen className="size-3.5 text-brand" />
            ) : (
              <PanelLeftClose className="size-3.5 text-muted" />
            )}
            <span className="hidden sm:inline">
              {isPaletteCollapsed ? "Mostrar paleta" : "Colapsar paleta"}
            </span>
          </Button>

          <span className="mx-0.5 h-4 w-px bg-border/80" />

          {/* Ajustar vista */}
          <Button size="sm" variant="ghost" onPress={fitView} className="h-8 gap-1.5 rounded-lg text-[11px]">
            <Maximize className="size-3.5" />
            <span className="hidden sm:inline">Ajustar</span>
          </Button>

          {/* Auto-ajustar tarea seleccionada al texto si está seleccionada */}
          {hasSelectedTask && (
            <Button
              size="sm"
              variant="secondary"
              onPress={autoFitSelectedTask}
              className="h-8 gap-1.5 rounded-lg border border-brand/30 bg-surface-secondary text-[11px] font-semibold text-brand hover:bg-brand-soft/50 animate-soft-in"
              aria-label="Ajustar dimensiones de la tarea seleccionada al texto"
            >
              <Maximize2 className="size-3.5 text-brand" />
              <span>Ajustar al texto</span>
            </Button>
          )}

          {/* Botón Asistente IA (Gemini) */}
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setIsAiModalOpen(true)}
            className="h-8 gap-1.5 rounded-lg border border-brand/20 bg-brand-soft/70 px-2.5 font-semibold text-brand text-[11px] hover:bg-brand-soft dark:bg-brand/15 dark:text-blue-300"
          >
            <Sparkles className="size-3.5 text-brand dark:text-blue-300" />
            Crear con IA (Gemini)
          </Button>

          {/* Importar archivo */}
          <Button
            size="sm"
            variant="ghost"
            onPress={() => fileInputRef.current?.click()}
            className="h-8 gap-1.5 rounded-lg text-[11px]"
          >
            <FileUp className="size-3.5" />
            Importar .bpmn
          </Button>

          {/* Descargas */}
          <Button size="sm" variant="ghost" onPress={() => void exportBpmn()} className="h-8 gap-1.5 rounded-lg text-[11px]">
            <Download className="size-3.5" />
            Descargar .bpmn
          </Button>
          <Button size="sm" variant="ghost" onPress={() => void exportSvg()} className="h-8 gap-1.5 rounded-lg text-[11px]">
            <ImageDown className="size-3.5" />
            SVG
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".bpmn,.xml,application/xml,text/xml"
            className="hidden"
            onChange={(event) => void importFile(event)}
          />
        </div>

        {/* Paleta rápida de colores para AS-IS y TO-BE */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface-secondary/40 px-2 py-1">
          <span className="flex items-center gap-1 text-[10px] font-medium text-muted mr-1">
            <Paintbrush className="size-3 text-muted" />
            Colores {selectedCount > 0 && <span className="font-semibold text-foreground">({selectedCount})</span>}:
          </span>
          {COLOR_PRESETS.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => applyColor(color)}
              title={color.name}
              aria-label={color.name}
              className="size-4.5 rounded-full border border-black/10 transition-transform hover:scale-125 focus:outline-none focus:ring-1 focus:ring-brand"
              style={{ backgroundColor: color.stroke }}
            />
          ))}
          <button
            type="button"
            onClick={() => applyColor()}
            title="Restablecer color predeterminado"
            aria-label="Restablecer color"
            className="grid size-4.5 place-items-center rounded-full border border-border bg-surface text-muted transition-transform hover:scale-125 hover:text-foreground"
          >
            <RotateCcw className="size-2.5" />
          </button>
        </div>
      </div>

      {/* Avisos contextuales */}
      {colorHint && (
        <div className="flex items-center gap-2 border-b border-amber-200/50 bg-amber-50/60 px-3 py-1.5 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <Info className="size-3.5 shrink-0 text-amber-600" />
          <span>{colorHint}</span>
        </div>
      )}

      {successNotice && (
        <div className="flex items-center gap-2 border-b border-emerald-200/50 bg-emerald-50/70 px-3 py-1.5 text-[11px] text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
          <Info className="size-3.5 shrink-0 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-danger/20 bg-danger-soft px-3 py-2 text-[11px] text-danger-soft-foreground">
          <p role="alert" className="flex-1">
            {error}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => setIsAiModalOpen(true)}
            className="h-6 gap-1 rounded-md px-2 text-[10px] text-brand underline"
          >
            Ver instrucciones de importación
          </Button>
        </div>
      )}

      {/* Contenedor del Canvas BPMN */}
      <div className="relative">
        {/* Botón flotante para abrir paleta cuando está colapsada */}
        {isPaletteCollapsed && (
          <button
            type="button"
            onClick={() => setIsPaletteCollapsed(false)}
            className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-xl border border-border/90 bg-surface/95 px-3 py-2 text-[11px] font-semibold text-foreground shadow-md backdrop-blur-sm transition-all hover:bg-surface hover:shadow-lg focus:outline-none focus:ring-1 focus:ring-brand animate-soft-in"
            title="Abrir paleta de herramientas BPMN"
          >
            <PanelLeftOpen className="size-3.5 text-brand" />
            <span>Paleta de Elementos</span>
          </button>
        )}

        <div
          ref={containerRef}
          className={cn(
            "bpmn-canvas h-[72vh] min-h-[500px] transition-all duration-300 [&_svg:focus]:outline-none",
            isPaletteCollapsed && "bpmn-palette-collapsed",
          )}
        />
      </div>

      {/* Modal de Asistente IA para BPMN */}
      <BpmnAiModal
        isOpen={isAiModalOpen}
        onOpenChange={setIsAiModalOpen}
        onApplyXml={(newXml, isAutoGenerated) => {
          void loadBpmnXml(newXml);
          if (isAutoGenerated) {
            setSuccessNotice(
              "Diagrama cargado con éxito. Se generaron las coordenadas visuales automáticamente.",
            );
          }
        }}
      />
    </div>
  );
}
