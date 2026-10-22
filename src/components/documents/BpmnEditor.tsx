import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@heroui/react";
import type { ModuleDeclaration } from "didi";
import BpmnModeler from "bpmn-js/lib/Modeler";
import type Canvas from "diagram-js/lib/core/Canvas";
import type EventBus from "diagram-js/lib/core/EventBus";
import BaseRenderer from "diagram-js/lib/draw/BaseRenderer";
import Palette from "diagram-js/lib/features/palette/Palette";
import RuleProvider from "diagram-js/lib/features/rules/RuleProvider";
import {
  Download,
  FileUp,
  ImageDown,
  Info,
  Layers,
  Maximize,
  Maximize2,
  Paintbrush,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Route,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import BpmnAiModal from "@/components/documents/BpmnAiModal";
import { calculateOrthogonalWaypoints, sanitizeAndPrepareBpmn } from "@/lib/bpmn-helper";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DiagramElement = any;

function findLane(element: DiagramElement): DiagramElement | undefined {
  let current = element?.parent;
  while (current) {
    if (current.type === "bpmn:Lane") return current;
    current = current.parent;
  }
  return undefined;
}

function isFlowNode(element: DiagramElement): boolean {
  const type = element?.businessObject?.$type || element?.type || "";
  return (
    type === "bpmn:Task" ||
    type.endsWith("Task") ||
    type.endsWith("Event") ||
    type.endsWith("Gateway") ||
    type.endsWith("Activity") ||
    type === "bpmn:CallActivity" ||
    type === "bpmn:SubProcess"
  );
}

function isContainerElement(element: DiagramElement): boolean {
  const type = element?.businessObject?.$type || element?.type || "";
  return (
    type === "bpmn:Lane" ||
    type === "bpmn:Participant" ||
    type === "bpmn:TextAnnotation" ||
    type === "bpmn:Group" ||
    type === "label"
  );
}

const BPMN_TRANSLATIONS: Record<string, string> = {
  " + shift + ": " + Mayús + ",
  "Activate create/remove space tool": "Activar herramienta de espacio (crear/quitar)",
  "Activate global connect tool": "Activar herramienta de conexión global",
  "Activate hand tool": "Activar herramienta de mano",
  "Activate lasso tool": "Activar herramienta de lazo",
  "Add lane above": "Añadir carril arriba",
  "Add lane below": "Añadir carril abajo",
  "Add text annotation": "Añadir anotación de texto",
  "Align elements": "Alinear elementos",
  "Align elements ": "Alinear elementos ",
  "Append compensation activity": "Añadir actividad de compensación",
  "Append conditional intermediate catch event": "Añadir evento intermedio condicional de captura",
  "Append end event": "Añadir evento de fin",
  "Append gateway": "Añadir compuerta",
  "Append intermediate/boundary event": "Añadir evento intermedio / de frontera",
  "Append message intermediate catch event": "Añadir evento intermedio de mensaje de captura",
  "Append receive task": "Añadir tarea de recepción",
  "Append signal intermediate catch event": "Añadir evento intermedio de señal de captura",
  "Append task": "Añadir tarea",
  "Append timer intermediate catch event": "Añadir evento intermedio de temporizador de captura",
  "Change element": "Cambiar elemento",
  Collection: "Colección",
  "Connect to other element": "Conectar con otro elemento",
  "Connect using association": "Conectar mediante asociación",
  "Connect using data input association": "Conectar mediante asociación de entrada de datos",
  "Create data object reference": "Crear referencia de objeto de datos",
  "Create data store reference": "Crear referencia de almacén de datos",
  "Create end event": "Crear evento de fin",
  "Create expanded sub-process": "Crear subproceso expandido",
  "Create gateway": "Crear compuerta",
  "Create group": "Crear grupo",
  "Create lane": "Crear carril",
  "Create intermediate/boundary event": "Crear evento intermedio / de frontera",
  "Create pool/participant": "Crear pool / participante",
  "Create start event": "Crear evento de inicio",
  "Create task": "Crear tarea",
  Delete: "Eliminar",
  "Distribute elements horizontally": "Distribuir elementos horizontalmente",
  "Distribute elements vertically": "Distribuir elementos verticalmente",
  "Divide into three lanes": "Dividir en tres carriles",
  "Divide into two lanes": "Dividir en dos carriles",
  "HELLO {you}": "HOLA {you}",
  Loop: "Bucle",
  "Open {element}": "Abrir {element}",
  "Parallel multi-instance": "Multiinstancia paralela",
  "Participant multiplicity": "Multiplicidad del participante",
  "Search in diagram": "Buscar en el diagrama",
  "Sequential multi-instance": "Multiinstancia secuencial",
  "Toggle non-interrupting": "Alternar no interrumpible",
};

function translateBpmn(template: string, replacements?: Record<string, string>): string {
  const translated = BPMN_TRANSLATIONS[template] ?? template;
  if (!replacements) return translated;

  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, () => String(value)),
    translated,
  );
}

const bpmnTranslateModule: ModuleDeclaration = {
  translate: ["value", translateBpmn],
};

type PaletteEntry = {
  group?: string;
  className?: string;
  title?: string;
  action?: {
    dragstart?: (event: Event) => void;
    click?: (event: Event) => void;
  };
};

type PaletteProviderLike = {
  registerProvider: (provider: { getPaletteEntries: () => Record<string, PaletteEntry> }) => void;
};

type ElementFactoryLike = {
  createShape: (attrs: Record<string, unknown>) => DiagramElement;
};

type CreateLike = {
  start: (event: Event, shape: unknown) => void;
};

/** Añade el carril a la paleta, junto al pool, al estilo de Bizagi. */
class BizagiPaletteProvider {
  static $inject = ["palette", "elementFactory", "create"];

  private elementFactory: ElementFactoryLike;
  private create: CreateLike;

  constructor(palette: PaletteProviderLike, elementFactory: ElementFactoryLike, create: CreateLike) {
    this.elementFactory = elementFactory;
    this.create = create;
    palette.registerProvider(this);
  }

  getPaletteEntries(): Record<string, PaletteEntry> {
    const startCreateLane = (event: Event) => {
      const shape = this.elementFactory.createShape({
        type: "bpmn:Lane",
        isHorizontal: true,
      });
      this.create.start(event, shape);
    };

    return {
      "create.lane": {
        group: "collaboration",
        className: "bpmn-icon-lane",
        title: translateBpmn("Create lane"),
        action: {
          dragstart: startCreateLane,
          click: startCreateLane,
        },
      },
    };
  }
}

const bizagiPaletteModule: ModuleDeclaration = {
  __init__: ["bizagiPaletteProvider"],
  bizagiPaletteProvider: ["type", BizagiPaletteProvider],
};

function elementType(element: DiagramElement): string {
  return element?.businessObject?.$type || element?.type || "";
}

function isParticipant(element: DiagramElement): boolean {
  return elementType(element) === "bpmn:Participant";
}

function isLane(element: DiagramElement): boolean {
  return elementType(element) === "bpmn:Lane";
}

/* ---------------------------------------------------------------------------
 * Comportamiento tipo Bizagi
 * ------------------------------------------------------------------------- */

/**
 * Paleta en su propia columna, al lado del lienzo y no encima de él. bpmn-js la monta
 * dentro del contenedor del canvas; aquí se monta en el elemento padre, de modo que el
 * área de dibujo empieza a la derecha de la paleta y ningún pool puede quedar debajo.
 * Además, las coordenadas del ratón vuelven a coincidir con las del SVG.
 */
class DockedPalette extends Palette {
  static $inject = ["eventBus", "canvas"];

  private dockCanvas: { getContainer: () => HTMLElement };

  constructor(eventBus: EventBus, canvas: Canvas) {
    super(eventBus, canvas);
    this.dockCanvas = canvas;
  }

  _getParentContainer(): HTMLElement {
    const container = this.dockCanvas.getContainer();
    return (container.parentElement ?? container) as HTMLElement;
  }
}

const dockedPaletteModule: ModuleDeclaration = {
  palette: ["type", DockedPalette],
};

/** Pools y carriles: el redimensionado sólo agranda o achica hacia la derecha y hacia abajo. */
const CONTAINER_RESIZE_DIRECTIONS = ["e", "s", "se"];

/**
 * Reglas Bizagi: el pool y sus carriles son estáticos (no se arrastran) y sólo cambian
 * de ancho y alto. Como `ResizeHandles` sólo dibuja los tiradores que la regla permite,
 * los de arriba e izquierda ni siquiera aparecen. Al redimensionar el pool, bpmn-js
 * ajusta los carriles automáticamente (`resizeLane`).
 */
class BizagiRules extends RuleProvider {
  static $inject = ["eventBus"];

  init() {
    this.addRule("elements.move", 2000, (context: { shapes?: DiagramElement[] }) => {
      if ((context.shapes ?? []).some((shape) => isParticipant(shape) || isLane(shape))) {
        return false;
      }
    });

    this.addRule("shape.resize", 2000, (context: { shape?: DiagramElement; direction?: string }) => {
      const { shape, direction } = context;
      if (!isParticipant(shape) && !isLane(shape)) return;
      if (direction && !CONTAINER_RESIZE_DIRECTIONS.includes(direction)) return false;
    });
  }
}

const bizagiRulesModule: ModuleDeclaration = {
  __init__: ["bizagiRules"],
  bizagiRules: ["type", BizagiRules],
};

type LassoToolLike = { activateLasso: (event: MouseEvent, autoActivate?: boolean) => void };
type DraggingLike = { context: () => { prefix?: string } | undefined };

/**
 * En bpmn-js el interior de un pool/carril no es "clicable": el arrastre cae en el fondo
 * del lienzo y desplaza toda la vista (por eso parecía que el pool se movía). Como en
 * Bizagi, arrastrar sobre el fondo dibuja un lazo de selección; la vista se desplaza con
 * las barras, la rueda o el botón derecho.
 */
class ContainerLassoBehavior {
  static $inject = ["eventBus", "canvas", "lassoTool", "dragging"];

  constructor(
    eventBus: EventBus,
    canvas: Canvas,
    lassoTool: LassoToolLike,
    dragging: DraggingLike,
  ) {
    eventBus.on("element.mousedown", 1200, (event: { element?: DiagramElement; originalEvent?: MouseEvent }) => {
      const { element, originalEvent } = event;
      if (!originalEvent || originalEvent.button !== 0) return;
      // Mayús/Ctrl conservan el lazo nativo de diagram-js.
      if (originalEvent.shiftKey || originalEvent.ctrlKey || originalEvent.metaKey) return;
      // Si ya hay un arrastre en curso (por ejemplo, crear un carril desde la paleta)
      // no se activa el lazo: el lazo cancelaría la creación del elemento.
      const dragContext = dragging.context();
      if (dragContext && !/^lasso/.test(dragContext.prefix ?? "")) return;
      // El interior de pools/carriles usa una zona "djs-hit-no-move" que desplaza la vista;
      // su encabezado y su borde no, y siguen sirviendo para seleccionar y redimensionar.
      const onContainerBody =
        (isParticipant(element) || isLane(element)) &&
        originalEvent.target instanceof Element &&
        originalEvent.target.classList.contains("djs-hit-no-move");
      if (element !== canvas.getRootElement() && !onContainerBody) return;
      // activateLasso dibuja el lazo en este mismo arrastre (activateSelection sólo
      // "elige" la herramienta). Un clic sin arrastre sigue comportándose como clic.
      lassoTool.activateLasso(originalEvent);
      return false;
    });
    // Mover pools y carriles lo impide la regla `elements.move` de BizagiRules.
  }
}

const containerLassoModule: ModuleDeclaration = {
  __init__: ["containerLassoBehavior"],
  containerLassoBehavior: ["type", ContainerLassoBehavior],
};

/** Colores por defecto al estilo Bizagi: inicio verde, fin rojo, tareas azul medio. */
const BIZAGI_COLORS = {
  start: { fill: "#dcfce7", stroke: "#16a34a" },
  end: { fill: "#fee2e2", stroke: "#dc2626" },
  task: { fill: "#cfe2fb", stroke: "#1d5bb8" },
} as const;

function bizagiColorsFor(element: DiagramElement) {
  const type = elementType(element);
  if (type === "bpmn:StartEvent") return BIZAGI_COLORS.start;
  if (type === "bpmn:EndEvent") return BIZAGI_COLORS.end;
  if (type === "bpmn:Task" || type.endsWith("Task") || type === "bpmn:CallActivity") {
    return BIZAGI_COLORS.task;
  }
  return null;
}

function hasCustomColor(element: DiagramElement): boolean {
  const di = element?.di;
  return Boolean(
    di?.get?.("color:background-color") ||
      di?.get?.("color:border-color") ||
      di?.get?.("bioc:fill") ||
      di?.get?.("bioc:stroke"),
  );
}

type BpmnRendererLike = {
  drawShape: (parentGfx: SVGElement, element: DiagramElement, attrs?: Record<string, string>) => SVGElement;
  getShapePath: (element: DiagramElement) => string;
};

/**
 * Pinta inicio, fin y tareas con los colores Bizagi sin escribirlos en el XML. Si el
 * elemento ya tiene un color propio (botones de color), se respeta ese. El SVG exportado
 * incluye estos colores porque se generan al dibujar.
 */
class BizagiColorRenderer extends BaseRenderer {
  static $inject = ["eventBus", "bpmnRenderer"];

  private bpmnRenderer: BpmnRendererLike;

  constructor(eventBus: EventBus, bpmnRenderer: BpmnRendererLike) {
    super(eventBus, 1500);
    this.bpmnRenderer = bpmnRenderer;
  }

  canRender(element: DiagramElement): boolean {
    return !element.labelTarget && Boolean(bizagiColorsFor(element)) && !hasCustomColor(element);
  }

  drawShape(parentGfx: SVGElement, element: DiagramElement): SVGElement {
    const colors = bizagiColorsFor(element)!;
    return this.bpmnRenderer.drawShape(parentGfx, element, { fill: colors.fill, stroke: colors.stroke });
  }

  getShapePath(element: DiagramElement): string {
    return this.bpmnRenderer.getShapePath(element);
  }
}

const bizagiColorModule: ModuleDeclaration = {
  __init__: ["bizagiColorRenderer"],
  bizagiColorRenderer: ["type", BizagiColorRenderer],
};

type ContextPadElement = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  waypoints?: Array<{ x: number; y: number }>;
};

type ContextPadPosition = {
  left?: number;
  top?: number;
  x?: number;
  y?: number;
};

interface ContextPadLike {
  _getPosition?: (target: unknown) => ContextPadPosition;
}

interface CanvasLike {
  getContainer: () => HTMLElement;
  viewbox: () => { x: number; y: number; scale: number };
}

interface CanvasApi {
  zoom: (level?: string | number) => number;
  scroll: (delta: { dx: number; dy: number }) => void;
  resized: () => void;
}

type CanvasViewbox = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  inner: { x: number; y: number; width: number; height: number };
  outer: { width: number; height: number };
};

interface ScrollCanvasApi extends CanvasApi {
  viewbox: (box?: { x: number; y: number; width: number; height: number }) => CanvasViewbox;
}

type ScrollAxis = "horizontal" | "vertical";

type ScrollMetric = {
  min: number;
  span: number;
  view: number;
  track: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface KeyboardLike {
  addListener: (
    priority: number,
    listener: (context: { keyEvent: KeyboardEvent }) => boolean | void,
    type?: string,
  ) => void;
  removeListener: (
    listener: (context: { keyEvent: KeyboardEvent }) => boolean | void,
    type?: string,
  ) => void;
}

/**
 * Permite desplazar el lienzo manteniendo pulsado el botón derecho del ratón
 * sobre una zona vacía, sin mover elementos ni abrir el menú contextual.
 */
function setupRightClickPan(container: HTMLElement, canvas: CanvasApi) {
  let panning = false;
  let lastX = 0;
  let lastY = 0;

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return true;
    return Boolean(
      target.closest(
        ".djs-element, .djs-bendpoints, .djs-context-pad, .djs-palette, .djs-popup, input, textarea, select, button",
      ),
    );
  };

  const stopPan = () => {
    if (!panning) return;
    panning = false;
    container.classList.remove("bpmn-panning");
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", stopPan);
  };

  const handleMove = (event: MouseEvent) => {
    if (!panning) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.scroll({ dx, dy });
    event.preventDefault();
  };

  const handleStart = (event: MouseEvent) => {
    if (event.button !== 2 || isInteractiveTarget(event.target)) return;
    panning = true;
    lastX = event.clientX;
    lastY = event.clientY;
    container.classList.add("bpmn-panning");
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", stopPan);
    event.preventDefault();
  };

  const handleContextMenu = (event: MouseEvent) => {
    if (isInteractiveTarget(event.target)) return;
    event.preventDefault();
  };

  container.addEventListener("mousedown", handleStart);
  container.addEventListener("contextmenu", handleContextMenu);

  return () => {
    stopPan();
    container.removeEventListener("mousedown", handleStart);
    container.removeEventListener("contextmenu", handleContextMenu);
  };
}

/**
 * Reposiciona el context pad respecto al contenedor real del editor, teniendo en
 * cuenta la paleta lateral y el zoom, y lo mantiene dentro de los límites visibles.
 */
function patchContextPadPosition(modeler: BpmnModeler) {
  const contextPad = modeler.get("contextPad") as ContextPadLike;
  const canvas = modeler.get("canvas") as CanvasLike;
  const original = contextPad._getPosition;
  if (typeof original !== "function") return;

  contextPad._getPosition = (target: unknown) => {
    if (Array.isArray(target)) return original.call(contextPad, target);

    const element = target as ContextPadElement;
    const container = canvas.getContainer();
    const svg = container.querySelector("svg") as SVGSVGElement | null;
    const containerBounds = container.getBoundingClientRect();
    if (!svg) return original.call(contextPad, target);

    const viewbox = canvas.viewbox();
    const svgBounds = svg.getBoundingClientRect();
    const offsetX = svgBounds.left - containerBounds.left;
    const offsetY = svgBounds.top - containerBounds.top;

    let anchorX: number;
    let anchorY: number;
    let width = 0;
    let height = 0;

    if (element.waypoints?.length) {
      const last = element.waypoints[element.waypoints.length - 1];
      anchorX = offsetX + (last.x - viewbox.x) * viewbox.scale;
      anchorY = offsetY + (last.y - viewbox.y) * viewbox.scale;
    } else if (
      element.x !== undefined &&
      element.y !== undefined &&
      element.width !== undefined &&
      element.height !== undefined
    ) {
      anchorX = offsetX + (element.x - viewbox.x) * viewbox.scale;
      anchorY = offsetY + (element.y - viewbox.y) * viewbox.scale;
      width = element.width * viewbox.scale;
      height = element.height * viewbox.scale;
    } else {
      return original.call(contextPad, target);
    }

    const margin = 12;
    const padWidth = 72;
    const padHeight = 104;
    let left = anchorX + width + margin;
    if (left + padWidth > containerBounds.width - 4) {
      left = anchorX - padWidth - margin;
    }

    const top = anchorY + height / 2 - padHeight / 2;

    return {
      left: Math.max(4, Math.min(left, containerBounds.width - padWidth - 4)),
      top: Math.max(4, Math.min(top, containerBounds.height - padHeight - 4)),
    };
  };
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
  const [zoomLevel, setZoomLevel] = useState(1);

  const horizontalTrackRef = useRef<HTMLDivElement>(null);
  const horizontalThumbRef = useRef<HTMLDivElement>(null);
  const verticalTrackRef = useRef<HTMLDivElement>(null);
  const verticalThumbRef = useRef<HTMLDivElement>(null);
  const scrollMetricsRef = useRef<Record<ScrollAxis, ScrollMetric>>({
    horizontal: { min: 0, span: 1, view: 1, track: 1 },
    vertical: { min: 0, span: 1, view: 1, track: 1 },
  });

  const syncScrollbars = useCallback(() => {
    const modeler = modelerRef.current;
    if (!modeler) return;

    const canvas = modeler.get("canvas") as ScrollCanvasApi;
    const viewbox = canvas.viewbox();
    const margin = 120;

    const left = Math.min(viewbox.inner.x, viewbox.x) - margin;
    const top = Math.min(viewbox.inner.y, viewbox.y) - margin;
    const right =
      Math.max(viewbox.inner.x + viewbox.inner.width, viewbox.x + viewbox.width) + margin;
    const bottom =
      Math.max(viewbox.inner.y + viewbox.inner.height, viewbox.y + viewbox.height) + margin;

    const horizontalSpan = Math.max(right - left, viewbox.width);
    const verticalSpan = Math.max(bottom - top, viewbox.height);

    const updateAxis = (
      axis: ScrollAxis,
      track: HTMLDivElement | null,
      thumb: HTMLDivElement | null,
      min: number,
      span: number,
      view: number,
    ) => {
      if (!track || !thumb) return;

      const trackSize = axis === "horizontal" ? track.clientWidth : track.clientHeight;
      if (!trackSize) return;

      const ratio = clamp(view / span, 0.08, 1);
      const thumbSize = Math.max(36, Math.round(trackSize * ratio));
      const current = axis === "horizontal" ? viewbox.x : viewbox.y;
      const offset = clamp(
        ((current - min) / Math.max(span - view, 1)) * (trackSize - thumbSize),
        0,
        Math.max(0, trackSize - thumbSize),
      );

      scrollMetricsRef.current[axis] = { min, span, view, track: trackSize };

      if (axis === "horizontal") {
        thumb.style.width = `${thumbSize}px`;
        thumb.style.transform = `translateX(${offset}px)`;
      } else {
        thumb.style.height = `${thumbSize}px`;
        thumb.style.transform = `translateY(${offset}px)`;
      }
    };

    updateAxis(
      "horizontal",
      horizontalTrackRef.current,
      horizontalThumbRef.current,
      left,
      horizontalSpan,
      viewbox.width,
    );
    updateAxis(
      "vertical",
      verticalTrackRef.current,
      verticalThumbRef.current,
      top,
      verticalSpan,
      viewbox.height,
    );
  }, []);

  const startScrollDrag = (axis: ScrollAxis, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const canvas = modelerRef.current?.get("canvas") as ScrollCanvasApi | undefined;
    if (!canvas) return;

    event.preventDefault();
    const metric = scrollMetricsRef.current[axis];
    const startPointer = axis === "horizontal" ? event.clientX : event.clientY;
    const viewbox = canvas.viewbox();
    const startView = axis === "horizontal" ? viewbox.x : viewbox.y;

    const handleMove = (moveEvent: PointerEvent) => {
      const pointer = axis === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
      const delta = ((pointer - startPointer) / Math.max(metric.track, 1)) * metric.span;
      const current = canvas.viewbox();
      const next = clamp(
        startView + delta,
        metric.min,
        metric.min + Math.max(metric.span - metric.view, 0),
      );

      canvas.viewbox({
        x: axis === "horizontal" ? next : current.x,
        y: axis === "vertical" ? next : current.y,
        width: current.width,
        height: current.height,
      });
    };

    const stopDrag = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  };

  /** Aplica clases estables a carriles, flujos de mensaje, fases y feedback para el CSS. */
  const decorateDiagram = useCallback(() => {
    const modeler = modelerRef.current;
    if (!modeler) return;
    const elementRegistry = modeler.get("elementRegistry") as {
      filter: (fn: (el: DiagramElement) => boolean) => DiagramElement[];
      getGraphics: (el: DiagramElement) => SVGElement | undefined;
    };

    const lanes = elementRegistry.filter((el) => isLane(el));
    lanes.forEach((lane, index) => {
      const graphics = elementRegistry.getGraphics(lane);
      graphics?.classList.add("bpmn-lane");
      graphics?.classList.add(`bpmn-lane-${(index % 5) + 1}`);
    });

    elementRegistry.filter((el) => isParticipant(el)).forEach((participant) => {
      elementRegistry.getGraphics(participant)?.classList.add("bpmn-participant");
    });

    elementRegistry
      .filter((el) => isLane(el) || isParticipant(el))
      .forEach((element) => {
        const graphics = elementRegistry.getGraphics(element);
        if (!graphics) return;

        const fill =
          element.di?.get?.("color:background-color") || element.di?.get?.("bioc:fill");
        const stroke =
          element.di?.get?.("color:border-color") || element.di?.get?.("bioc:stroke");

        graphics.classList.toggle("bpmn-custom-fill", Boolean(fill));
        graphics.classList.toggle("bpmn-custom-stroke", Boolean(stroke));

        if (fill) graphics.style.setProperty("--bpmn-custom-fill", String(fill));
        else graphics.style.removeProperty("--bpmn-custom-fill");

        if (stroke) graphics.style.setProperty("--bpmn-custom-stroke", String(stroke));
        else graphics.style.removeProperty("--bpmn-custom-stroke");
      });

    elementRegistry.filter((el) => el.waypoints).forEach((connection) => {
      const graphics = elementRegistry.getGraphics(connection);
      if (!graphics) return;
      const businessObject = connection.businessObject;
      if (businessObject?.$type === "bpmn:MessageFlow") {
        graphics.classList.add("bpmn-message-flow");
      }
      if (businessObject?.id === "Flow_Feedback") {
        graphics.classList.add("bpmn-feedback-flow");
      }
    });

    elementRegistry
      .filter((el) => el.businessObject?.$type === "bpmn:TextAnnotation")
      .forEach((annotation) => {
        elementRegistry.getGraphics(annotation)?.classList.add("bpmn-phase");
      });
  }, []);

  const scheduleDecorate = useCallback(() => {
    window.requestAnimationFrame(() => decorateDiagram());
  }, [decorateDiagram]);

  /** Mantiene todos los nodos dentro de los límites verticales de su carril. */
  const alignShapesToLanes = () => {
    const modeler = modelerRef.current;
    if (!modeler) return;
    const elementRegistry = modeler.get("elementRegistry") as {
      filter: (fn: (el: DiagramElement) => boolean) => DiagramElement[];
    };
    const modeling = modeler.get("modeling") as {
      moveElements: (elements: DiagramElement[], delta: { x: number; y: number }) => void;
    };

    const nodes = elementRegistry.filter(
      (el) => isFlowNode(el) && !el.waypoints && !isContainerElement(el),
    );

    let moved = 0;
    nodes.forEach((element) => {
      const lane = findLane(element);
      if (!lane || element.height === undefined) return;

      const padding = 14;
      const minY = lane.y + padding;
      const maxY = lane.y + lane.height - padding - element.height;
      if (maxY < minY) return;

      let deltaY = 0;
      if (element.y < minY) deltaY = minY - element.y;
      else if (element.y > maxY) deltaY = maxY - element.y;

      if (Math.abs(deltaY) >= 1) {
        modeling.moveElements([element], { x: 0, y: deltaY });
        moved += 1;
      }
    });

    scheduleDecorate();
    setSuccessNotice(
      moved > 0
        ? `${moved} elemento(s) reubicado(s) dentro de sus carriles.`
        : "Todos los elementos ya están dentro de sus carriles.",
    );
    setTimeout(() => setSuccessNotice(""), 4000);
  };

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const modeler = new BpmnModeler({
      container: containerRef.current!,
      additionalModules: [
        bpmnTranslateModule,
        dockedPaletteModule,
        bizagiPaletteModule,
        bizagiRulesModule,
        containerLassoModule,
        bizagiColorModule,
      ],
      textRenderer: {
        defaultStyle: {
          fontFamily: '"Montserrat", ui-sans-serif, system-ui, sans-serif',
        },
      },
    });
    patchContextPadPosition(modeler);
    modelerRef.current = modeler;
    if (import.meta.env.DEV) (window as unknown as { __bpmnModeler?: BpmnModeler }).__bpmnModeler = modeler; // TEMP-DEBUG
    lastXml.current = null;

    const eventBus = modeler.get("eventBus") as {
      on: (event: string, priority: number, fn: (context: Record<string, unknown>) => unknown) => void;
    };
    const elementFactory = modeler.get("elementFactory") as ElementFactoryLike;
    const laneModeling = modeler.get("modeling") as {
      createShape: (
        shape: DiagramElement,
        position: { x: number; y: number; width: number; height: number },
        parent: DiagramElement,
      ) => DiagramElement;
      resizeShape: (
        shape: DiagramElement,
        bounds: { x: number; y: number; width: number; height: number },
      ) => void;
    };

    // Al crear un pool, lo inicializamos con dos carriles, como en Bizagi.
    eventBus.on("commandStack.shape.create.postExecuted", 1500, (event) => {
      const context = event.context as { shape?: DiagramElement } | undefined;
      const shape = context?.shape;
      if (!shape || !isParticipant(shape) || !shape.businessObject?.processRef) return;
      if (!shape.width || shape.width < 160 || !shape.height || shape.height < 120) return;
      if ((shape.children || []).some((child: DiagramElement) => isLane(child))) return;

      const inset = 30;
      const laneHeight = Math.round(shape.height / 2);
      ["Carril 1", "Carril 2"].forEach((name, index) => {
        const lane = elementFactory.createShape({
          type: "bpmn:Lane",
          isHorizontal: true,
        });
        lane.businessObject.name = name;
        laneModeling.createShape(
          lane,
          {
            x: shape.x + inset,
            y: shape.y + index * laneHeight,
            width: shape.width - inset,
            height: index === 0 ? laneHeight : shape.height - laneHeight,
          },
          shape,
        );
      });
    });

    // Los carriles creados desde la paleta ocupan todo el ancho de su pool.
    eventBus.on("commandStack.shape.create.postExecuted", 1400, (event) => {
      const context = event.context as { shape?: DiagramElement } | undefined;
      const lane = context?.shape;
      if (!lane || !isLane(lane) || !isParticipant(lane.parent)) return;

      const parent = lane.parent;
      const target = {
        x: parent.x + 30,
        y: lane.y,
        width: parent.width - 30,
        height: lane.height,
      };

      if (Math.abs(lane.x - target.x) > 1 || Math.abs(lane.width - target.width) > 1) {
        laneModeling.resizeShape(lane, target);
      }
    });

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

    // Al arrastrar un carril sobre otro, el destino es el pool que los contiene.
    const retargetLaneHover = (event: Record<string, unknown>) => {
      const hover = event.hover as DiagramElement | undefined;
      const shape = (event.context as { shape?: DiagramElement } | undefined)?.shape;
      if (!shape || !isLane(shape) || !isLane(hover)) return;

      let parent = hover.parent;
      while (parent && !isParticipant(parent)) parent = parent.parent;
      if (!parent) return;

      event.hover = parent;
      const registry = modeler.get("elementRegistry") as {
        getGraphics: (element: DiagramElement) => SVGElement | undefined;
      };
      event.hoverGfx = registry.getGraphics(parent);
    };

    eventBus.on("create.hover", 2000, retargetLaneHover);
    eventBus.on("create.move", 2000, retargetLaneHover);

    // Escuchar selección para la barra de colores y detección de tareas
    modeler.on("selection.changed", (event: { newSelection?: unknown[] }) => {
      const selection = event.newSelection ?? [];
      setSelectedCount(selection.length);
      const containsTask = selection.some((shape) => isTaskElement(shape));
      setHasSelectedTask(containsTask);
    });

    modeler.on("commandStack.changed", async () => {
      scheduleDecorate();
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

    const canvas = modeler.get("canvas") as ScrollCanvasApi;
    const selection = modeler.get("selection") as { get: () => DiagramElement[] };
    const modeling = modeler.get("modeling") as {
      moveElements: (elements: DiagramElement[], delta: { x: number; y: number }) => void;
    };
    const keyboard = modeler.get("keyboard") as KeyboardLike | undefined;

    const syncViewport = () => {
      setZoomLevel(canvas.zoom());
      syncScrollbars();
    };
    modeler.on("canvas.viewbox.changed", syncViewport);
    syncViewport();

    const handleArrowMove = (context: { keyEvent: KeyboardEvent }) => {
      const event = context.keyEvent;
      if (!event || event.ctrlKey || event.metaKey || event.altKey) return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;

      const selected = selection.get().filter((element) => !element.waypoints && element.parent);
      if (!selected.length) return;

      const step = event.shiftKey ? 10 : 1;
      const delta = { x: 0, y: 0 };
      if (event.key === "ArrowLeft") delta.x = -step;
      if (event.key === "ArrowRight") delta.x = step;
      if (event.key === "ArrowUp") delta.y = -step;
      if (event.key === "ArrowDown") delta.y = step;

      modeling.moveElements(selected, delta);
      event.preventDefault();
      return true;
    };

    keyboard?.addListener(1500, handleArrowMove, "keyboard.keydown");

    const container = containerRef.current;
    const cleanupPan = container ? setupRightClickPan(container, canvas) : () => {};
    const resizeObserver = container ? new ResizeObserver(syncScrollbars) : null;
    if (container && resizeObserver) resizeObserver.observe(container);

    return () => {
      keyboard?.removeListener(handleArrowMove, "keyboard.keydown");
      modeler.off("canvas.viewbox.changed", syncViewport);
      resizeObserver?.disconnect();
      cleanupPan();
      modeler.destroy();
      modelerRef.current = null;
    };
  }, [scheduleDecorate, syncScrollbars]);

  // Recalcula el tamaño del canvas y del context pad al plegar/desplegar la paleta.
  useEffect(() => {
    const modeler = modelerRef.current;
    if (!modeler) return;
    const timer = window.setTimeout(() => {
      const canvas = modeler.get("canvas") as { resized: () => void };
      canvas.resized();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [isPaletteCollapsed]);

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
        const canvas = modeler.get("canvas") as CanvasApi;
        canvas.zoom("fit-viewport");
        canvas.scroll({ dx: 24, dy: 0 });
        setZoomLevel(canvas.zoom());
        scheduleDecorate();
        syncScrollbars();
      })
      .catch((caught: unknown) => {
        if (!isCurrent()) return;
        setError(
          `No se pudo abrir el diagrama: ${caught instanceof Error ? caught.message : String(caught)}`,
        );
      });
  }, [xml, scheduleDecorate, syncScrollbars]);

  const fitView = () => {
    const canvas = modelerRef.current?.get("canvas") as CanvasApi | undefined;
    if (!canvas) return;

    canvas.zoom("fit-viewport");
    // Desplazamiento horizontal para que los encabezados de carriles nunca queden pegados al borde
    canvas.scroll({ dx: 24, dy: 0 });
    setZoomLevel(canvas.zoom());
  };

  const zoomBy = (factor: number) => {
    const canvas = modelerRef.current?.get("canvas") as CanvasApi | undefined;
    if (!canvas) return;
    const next = Math.min(4, Math.max(0.2, canvas.zoom() * factor));
    canvas.zoom(next);
    setZoomLevel(canvas.zoom());
  };

  const resetZoom = () => {
    const canvas = modelerRef.current?.get("canvas") as CanvasApi | undefined;
    if (!canvas) return;
    canvas.zoom(1);
    setZoomLevel(canvas.zoom());
  };

  const setZoomPercent = (percent: number) => {
    const canvas = modelerRef.current?.get("canvas") as CanvasApi | undefined;
    if (!canvas) return;
    canvas.zoom(clamp(percent / 100, 0.2, 4));
    setZoomLevel(canvas.zoom());
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

  const reRouteAllOrthogonal = () => {
    const modeler = modelerRef.current;
    if (!modeler) return;

    const elementRegistry = modeler.get("elementRegistry") as {
      filter: (fn: (el: DiagramElement) => boolean) => DiagramElement[];
      getAll: () => DiagramElement[];
    };
    const modeling = modeler.get("modeling") as {
      updateWaypoints: (conn: DiagramElement, waypoints: { x: number; y: number }[]) => void;
    };

    const connections = elementRegistry.filter(
      (el) =>
        el.waypoints &&
        el.source &&
        el.target &&
        el.source.x !== undefined &&
        el.target.x !== undefined,
    );

    if (!connections.length) {
      setSuccessNotice("No se encontraron conexiones para re-enrutar.");
      setTimeout(() => setSuccessNotice(""), 3000);
      return;
    }

    const allElements = elementRegistry.getAll();
    const nodes = allElements.filter(
      (el) =>
        !el.waypoints &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.width !== undefined &&
        el.height !== undefined &&
        !isContainerElement(el),
    );

    let maxBottom = 0;
    nodes.forEach((el) => {
      const bottom = el.y + el.height;
      if (bottom > maxBottom) maxBottom = bottom;
    });

    connections.forEach((conn) => {
      const source = conn.source;
      const target = conn.target;
      if (!source || !target) return;

      const sourceLane = findLane(source);
      const targetLane = findLane(target);
      const obstacles = nodes
        .filter((node) => node !== source && node !== target)
        .map((node) => ({
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        }));

      // En retornos, el pasillo va dentro del carril destino para no cruzar todo el pool.
      const corridorY = targetLane
        ? targetLane.y + targetLane.height - 14
        : sourceLane
          ? sourceLane.y + sourceLane.height - 14
          : maxBottom > 0
            ? maxBottom + 45
            : undefined;

      const newWaypoints = calculateOrthogonalWaypoints(
        { x: source.x, y: source.y, width: source.width, height: source.height },
        { x: target.x, y: target.y, width: target.width, height: target.height },
        { obstacles, corridorY },
      );
      modeling.updateWaypoints(conn, newWaypoints);
    });

    scheduleDecorate();
    setSuccessNotice(
      "Conexiones re-enrutadas a 90° respetando carriles y esquivando nodos intermedios.",
    );
    setTimeout(() => setSuccessNotice(""), 4000);
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
      scheduleDecorate();

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
      setColorHint(
        "Haz clic en una tarea, compuerta, evento, pool o carril antes de aplicar color.",
      );
      setTimeout(() => setColorHint(""), 4000);
      return;
    }

    const modelingService = modeler.get("modeling") as {
      setColor: (elements: unknown[], colors: { stroke?: string; fill?: string }) => void;
    };

    if (color) {
      modelingService.setColor(selected, { stroke: color.stroke, fill: color.fill });
    } else {
      modelingService.setColor(selected, { stroke: undefined, fill: undefined });
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

          {/* Alinear nodos dentro de sus carriles */}
          <Button
            size="sm"
            variant="ghost"
            onPress={alignShapesToLanes}
            className="h-8 gap-1.5 rounded-lg text-[11px]"
            aria-label="Mantener todos los elementos dentro de los límites de su carril"
          >
            <Layers className="size-3.5" />
            <span className="hidden sm:inline">Alinear carriles</span>
          </Button>

          {/* Re-enrutar conectores en ángulos de 90° */}
          <Button
            size="sm"
            variant="ghost"
            onPress={reRouteAllOrthogonal}
            className="h-8 gap-1.5 rounded-lg text-[11px]"
            aria-label="Re-enrutar todas las conexiones en ángulos rectos esquivando nodos"
          >
            <Route className="size-3.5" />
            <span className="hidden sm:inline">Rutas 90°</span>
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

        {/* Barras de desplazamiento propias, sincronizadas con el viewbox del canvas */}
        <div
          ref={horizontalTrackRef}
          className="bpmn-scrollbar bpmn-scrollbar-horizontal"
          role="scrollbar"
          aria-label="Desplazar el diagrama horizontalmente"
          aria-orientation="horizontal"
          onPointerDown={(event) => startScrollDrag("horizontal", event)}
        >
          <div ref={horizontalThumbRef} className="bpmn-scrollbar-thumb" />
        </div>

        <div
          ref={verticalTrackRef}
          className="bpmn-scrollbar bpmn-scrollbar-vertical"
          role="scrollbar"
          aria-label="Desplazar el diagrama verticalmente"
          aria-orientation="vertical"
          onPointerDown={(event) => startScrollDrag("vertical", event)}
        >
          <div ref={verticalThumbRef} className="bpmn-scrollbar-thumb" />
        </div>
      </div>

      {/* Footer de navegación y zoom, fijo bajo el lienzo */}
      <div className="bpmn-footer flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-surface px-3 py-1.5">
        <p className="text-[10px] text-muted">
          Arrastra para seleccionar · clic derecho + arrastrar, rueda o barras para desplazarte · Ctrl + rueda para zoom.
        </p>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.2)}
            title="Alejar (Ctrl + rueda)"
            aria-label="Alejar zoom"
            className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-secondary hover:text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <ZoomOut className="size-3.5" />
          </button>

          <input
            type="range"
            min={20}
            max={400}
            step={5}
            value={Math.round(zoomLevel * 100)}
            onChange={(event) => setZoomPercent(Number(event.target.value))}
            aria-label="Nivel de zoom"
            title="Nivel de zoom"
            className="bpmn-zoom-slider"
          />

          <button
            type="button"
            onClick={() => zoomBy(1.2)}
            title="Acercar (Ctrl + rueda)"
            aria-label="Acercar zoom"
            className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-secondary hover:text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <ZoomIn className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={resetZoom}
            title="Restablecer zoom al 100%"
            aria-label={`Zoom actual ${Math.round(zoomLevel * 100)} por ciento. Restablecer al 100%`}
            className="h-7 min-w-11 rounded-lg px-1.5 text-[11px] font-semibold tabular-nums text-foreground transition-colors hover:bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          <span className="mx-0.5 h-4 w-px bg-border/80" />

          <button
            type="button"
            onClick={fitView}
            title="Ajustar diagrama a la pantalla"
            aria-label="Ajustar diagrama a la pantalla"
            className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-secondary hover:text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <Maximize className="size-3.5" />
          </button>
        </div>
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
