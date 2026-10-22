// Plantillas base que se pueden cargar desde la sección Plantillas. Solo definen estructura
// (secciones y columnas de tablas), nunca datos. Las usa la API (api/_lib) al sembrarlas.
import type { ProjectPhase, TemplateFormat } from "../types/domain";

export interface BaseTemplate {
  phase: ProjectPhase;
  name: string;
  format: TemplateFormat;
  description: string;
  content: string;
}

type ColumnType = "text" | "number" | "checkbox" | "date" | "url" | "email" | "phone" | "select" | "multiselect";

interface ColumnSpec {
  title: string;
  type?: ColumnType;
  options?: string[];
  width?: number;
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Tabla estructurada del editor (mismo formato de estado que structured-table.tsx).
 * `firstColumnValues` precarga la primera columna, p. ej. para tablas Campo / Valor.
 */
function table(columns: ColumnSpec[], firstColumnValues: string[] = [""]): string {
  const cols = columns.map((column) => ({
    id: slug(column.title),
    title: column.title,
    type: column.type ?? "text",
    width: column.width ?? (column.type === "checkbox" ? 110 : 170),
    ...(column.options ? { options: column.options } : {}),
  }));
  const rows = firstColumnValues.map((first, index) => {
    const row: Record<string, unknown> = { id: `row-${index + 1}`, height: 40 };
    cols.forEach((column, columnIndex) => {
      row[column.id] = column.type === "checkbox" ? false : columnIndex === 0 ? first : "";
    });
    return row;
  });
  const state = JSON.stringify({ columns: cols, rows });
  return `<div data-type="structured-table" data-state="${escapeAttribute(state)}"></div>`;
}

function mermaid(code: string): string {
  return `<div data-type="mermaid" data-code="${escapeAttribute(JSON.stringify(code))}"></div>`;
}

function doc(...blocks: string[]): string {
  return blocks.join("\n\n") + "\n";
}


/** Diagrama BPMN 2.0 vacío con un evento de inicio. */
export function emptyBpmn(processName: string): string {
  const id = `Proceso_${slug(processName) || "principal"}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${id}" name="${escapeAttribute(processName)}" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Inicio" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${id}">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
}

export const BASE_TEMPLATES: BaseTemplate[] = [
  {
    phase: "Iniciación",
    name: "Business Case",
    format: "Documento",
    description: "Justificación del proyecto: problema, alternativas, costos y beneficios.",
    content: doc(
      "# Business Case",
      "## 1. Resumen ejecutivo",
      "## 2. Problema u oportunidad",
      "## 3. Objetivos del negocio",
      "## 4. Alternativas evaluadas",
      table([
        { title: "Alternativa" },
        { title: "Descripción", width: 240 },
        { title: "Costo estimado", type: "number" },
        { title: "Beneficio esperado", width: 220 },
        { title: "Recomendada", type: "checkbox" },
      ]),
      "## 5. Costos estimados",
      table([
        { title: "Concepto" },
        { title: "Tipo", type: "select", options: ["CAPEX", "OPEX"] },
        { title: "Monto", type: "number" },
        { title: "Notas", width: 240 },
      ]),
      "## 6. Beneficios esperados",
      "## 7. Riesgos principales",
      "## 8. Recomendación",
    ),
  },
  {
    phase: "Iniciación",
    name: "Project Charter",
    format: "Documento",
    description: "Acta de constitución: propósito, objetivos, alcance de alto nivel e hitos.",
    content: doc(
      "# Project Charter",
      "## Información del proyecto",
      table([{ title: "Campo" }, { title: "Valor", width: 320 }], [
        "Nombre del proyecto",
        "Sponsor",
        "Responsable del proyecto",
        "Fecha de inicio",
        "Fecha estimada de cierre",
        "Presupuesto",
      ]),
      "## Propósito y justificación",
      "## Objetivos",
      "## Alcance de alto nivel",
      "### Incluye",
      "### No incluye",
      "## Entregables principales",
      "## Hitos",
      table([
        { title: "Hito", width: 240 },
        { title: "Fecha", type: "date" },
        { title: "Estado", type: "select", options: ["Pendiente", "En curso", "Cumplido"] },
      ]),
      "## Supuestos y restricciones",
      "## Riesgos de alto nivel",
      "## Aprobaciones",
      table([
        { title: "Nombre" },
        { title: "Rol" },
        { title: "Fecha", type: "date" },
        { title: "Aprobado", type: "checkbox" },
      ]),
    ),
  },
  {
    phase: "Sistemas y Procesos",
    name: "Proceso AS-IS",
    format: "Imagen",
    description: "Diagrama del proceso tal como funciona hoy (imagen del BPMN o del flujo real).",
    content: "",
  },
  {
    phase: "Sistemas y Procesos",
    name: "Proceso TO-BE",
    format: "Imagen",
    description: "Diagrama del proceso objetivo, ya mejorado o automatizado.",
    content: "",
  },
  {
    phase: "Datos e Integración",
    name: "Data Map",
    format: "Documento",
    description: "Mapeo de datos entre sistemas origen y destino, con reglas de transformación.",
    content: doc(
      "# Data Map",
      "## Mapeo de campos",
      table([
        { title: "Sistema origen" },
        { title: "Entidad / Tabla" },
        { title: "Campo origen" },
        { title: "Tipo de dato", type: "select", options: ["Texto", "Número", "Fecha", "Booleano", "Otro"] },
        { title: "Sistema destino" },
        { title: "Campo destino" },
        { title: "Regla de transformación", width: 260 },
        { title: "Frecuencia", type: "select", options: ["Tiempo real", "Diaria", "Semanal", "Mensual", "Manual"] },
      ]),
      "## Flujo de integración",
      mermaid("flowchart LR\n  A[Sistema origen] --> B[Transformación] --> C[Sistema destino]"),
      "## Observaciones",
    ),
  },
  {
    phase: "Planificación",
    name: "Scope Statement",
    format: "Documento",
    description: "Enunciado del alcance: entregables, criterios de aceptación y exclusiones.",
    content: doc(
      "# Scope Statement",
      "## Descripción del alcance",
      "## Entregables",
      table([
        { title: "Entregable", width: 220 },
        { title: "Descripción", width: 280 },
        { title: "Criterio de aceptación", width: 260 },
        { title: "Fecha", type: "date" },
      ]),
      "## Criterios de aceptación del proyecto",
      "## Exclusiones",
      "## Restricciones",
      "## Supuestos",
    ),
  },
  {
    phase: "Planificación",
    name: "Cronograma de Tareas",
    format: "Documento",
    description: "Tareas del proyecto con responsables, fechas, dependencias y estado.",
    content: doc(
      "# Cronograma de Tareas",
      table([
        { title: "Tarea", width: 240 },
        { title: "Fase", type: "select", options: ["Iniciación", "Descubrimiento", "Sistemas y Procesos", "Datos e Integración", "Planificación", "Ejecución", "Cierre"] },
        { title: "Responsable" },
        { title: "Inicio", type: "date" },
        { title: "Fin", type: "date" },
        { title: "Depende de" },
        { title: "Estado", type: "select", options: ["Pendiente", "En curso", "Bloqueado", "Hecho"] },
      ]),
    ),
  },
  {
    phase: "Planificación",
    name: "Plan de Gestión",
    format: "Documento",
    description: "Cómo se gestionarán alcance, cronograma, comunicación, cambios y calidad.",
    content: doc(
      "# Plan de Gestión del Proyecto",
      "## Gestión del alcance",
      "## Gestión del cronograma",
      "## Gestión de la comunicación",
      table([
        { title: "Información", width: 220 },
        { title: "Audiencia" },
        { title: "Canal", type: "select", options: ["Correo", "Reunión", "Chat", "Documento"] },
        { title: "Frecuencia", type: "select", options: ["Diaria", "Semanal", "Quincenal", "Mensual", "Por hito"] },
        { title: "Responsable" },
      ]),
      "## Gestión de cambios",
      "## Gestión de la calidad",
      "## Gestión de riesgos",
    ),
  },
];
