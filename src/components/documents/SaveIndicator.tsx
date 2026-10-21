import { Button } from "@heroui/react";
import { CircleAlert, CloudCheck, LoaderCircle, PencilLine } from "lucide-react";
import type { SaveState } from "@/lib/useAutosave";
import { cn } from "@/lib/utils";

interface SaveIndicatorProps {
  state: SaveState;
  lastSavedAt: Date | null;
  error: string;
  onSave: () => void;
}

const timeFormat = new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit" });

export function SaveIndicator({ state, lastSavedAt, error, onSave }: SaveIndicatorProps) {
  const label =
    state === "saving"
      ? "Guardando..."
      : state === "dirty"
        ? "Cambios sin guardar"
        : state === "error"
          ? error || "No se pudo guardar"
          : lastSavedAt
            ? `Guardado a las ${timeFormat.format(lastSavedAt)}`
            : "Sin cambios";
  const Icon =
    state === "saving" ? LoaderCircle : state === "dirty" ? PencilLine : state === "error" ? CircleAlert : CloudCheck;

  return (
    <div className="flex items-center gap-2">
      <span
        role="status"
        className={cn(
          "inline-flex items-center gap-1.5 text-[10.5px]",
          state === "error" ? "text-danger" : "text-muted",
        )}
      >
        <Icon className={cn("size-3.5", state === "saving" && "animate-spin")} />
        {label}
      </span>
      <Button
        size="sm"
        variant={state === "error" ? "danger" : "secondary"}
        isDisabled={state === "saved" || state === "saving"}
        onPress={onSave}
        className="h-8 rounded-lg text-[10.5px]"
      >
        {state === "error" ? "Reintentar" : "Guardar"}
        <kbd className="ml-1 hidden text-[9px] text-muted sm:inline">Ctrl+S</kbd>
      </Button>
    </div>
  );
}
