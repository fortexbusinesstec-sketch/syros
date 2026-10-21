import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@heroui/react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import { Download, FileUp, ImageDown, Maximize } from "lucide-react";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";

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

export default function BpmnEditor({ xml, onChange, fileName }: BpmnEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const onChangeRef = useRef(onChange);
  const lastXml = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const modeler = new BpmnModeler({ container: containerRef.current! });
    modelerRef.current = modeler;
    // Un modelador nuevo empieza vacío: obliga a que el siguiente efecto importe el XML.
    lastXml.current = null;

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
    // Si el modelador se destruye antes de terminar (p. ej. StrictMode), se ignora el resultado.
    const isCurrent = () => modelerRef.current === modeler;
    modeler
      .importXML(xml)
      .then(() => {
        if (!isCurrent()) return;
        setError("");
        (modeler.get("canvas") as { zoom: (level: string) => void }).zoom("fit-viewport");
      })
      .catch((caught: unknown) => {
        if (!isCurrent()) return;
        setError(
          `No se pudo abrir el diagrama: ${caught instanceof Error ? caught.message : String(caught)}`,
        );
      });
  }, [xml]);

  const fitView = () => {
    (modelerRef.current?.get("canvas") as { zoom: (level: string) => void } | undefined)?.zoom(
      "fit-viewport",
    );
  };

  const exportBpmn = async () => {
    const result = await modelerRef.current?.saveXML({ format: true });
    if (result?.xml) download(result.xml, `${safeFileName(fileName)}.bpmn`, "application/xml");
  };

  const exportSvg = async () => {
    const result = await modelerRef.current?.saveSVG();
    if (result?.svg) download(result.svg, `${safeFileName(fileName)}.svg`, "image/svg+xml");
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !modelerRef.current) return;
    const text = await file.text();
    try {
      await modelerRef.current.importXML(text);
      (modelerRef.current.get("canvas") as { zoom: (level: string) => void }).zoom("fit-viewport");
      setError("");
      const { xml: imported } = await modelerRef.current.saveXML({ format: true });
      if (imported) {
        lastXml.current = imported;
        onChangeRef.current(imported);
      }
    } catch (caught) {
      setError(
        `El archivo no es un BPMN 2.0 válido: ${caught instanceof Error ? caught.message : String(caught)}`,
      );
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-surface">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/70 px-3 py-2">
        <Button size="sm" variant="ghost" onPress={fitView} className="h-8 gap-1.5 rounded-lg text-[11px]">
          <Maximize className="size-3.5" />
          Ajustar vista
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          size="sm"
          variant="ghost"
          onPress={() => fileInputRef.current?.click()}
          className="h-8 gap-1.5 rounded-lg text-[11px]"
        >
          <FileUp className="size-3.5" />
          Importar .bpmn
        </Button>
        <Button size="sm" variant="ghost" onPress={() => void exportBpmn()} className="h-8 gap-1.5 rounded-lg text-[11px]">
          <Download className="size-3.5" />
          Descargar .bpmn
        </Button>
        <Button size="sm" variant="ghost" onPress={() => void exportSvg()} className="h-8 gap-1.5 rounded-lg text-[11px]">
          <ImageDown className="size-3.5" />
          Descargar SVG
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".bpmn,.xml,application/xml,text/xml"
          className="hidden"
          onChange={(event) => void importFile(event)}
        />
        <span className="ml-auto hidden text-[10px] text-muted md:inline">
          Usa la paleta de la izquierda para agregar eventos, tareas, compuertas y carriles.
        </span>
      </div>
      {error && (
        <p role="alert" className="border-b border-danger/20 bg-danger-soft px-3 py-2 text-[11px] text-danger-soft-foreground">
          {error}
        </p>
      )}
      <div
        ref={containerRef}
        className="bpmn-canvas h-[70vh] min-h-[480px] bg-white [&_svg:focus]:outline-none"
      />
    </div>
  );
}
