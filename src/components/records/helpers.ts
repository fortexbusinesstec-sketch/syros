import { useState } from "react";
import type { FormValues } from "@/components/records/RecordFormModal";

export type ChipColor = "danger" | "warning" | "success" | "default" | "accent";

/** Color según nivel: Alta/Alto en rojo, Media/Medio en ámbar, Baja/Bajo neutro. */
export function levelColor(value: string | null | undefined): ChipColor {
  if (value === "Alta" || value === "Alto") return "danger";
  if (value === "Media" || value === "Medio") return "warning";
  return "default";
}

interface ModalState<T> {
  open: boolean;
  record: T | null;
  preset: FormValues;
  key: number;
}

/** Estado del formulario modal de un registro: nuevo (con valores iniciales) o edición. */
export function useRecordModal<T>() {
  const [state, setState] = useState<ModalState<T>>({ open: false, record: null, preset: {}, key: 0 });
  return {
    ...state,
    openNew: (preset: FormValues = {}) =>
      setState((current) => ({ open: true, record: null, preset, key: current.key + 1 })),
    openEdit: (record: T) =>
      setState((current) => ({ open: true, record, preset: {}, key: current.key + 1 })),
    setOpen: (open: boolean) => setState((current) => ({ ...current, open })),
  };
}

/** Convierte un registro a valores de formulario (los null pasan a ""). */
export function toFormValues(record: object | null, names: string[]): FormValues {
  const source = (record ?? {}) as Record<string, unknown>;
  return Object.fromEntries(names.map((name) => [name, source[name] == null ? "" : String(source[name])]));
}

/** Siguiente código correlativo: ("HU", ["HU-01", "HU-07"]) → "HU-08". */
export function nextCode(prefix: string, codes: (string | null)[]): string {
  const max = codes.reduce((highest, code) => {
    const match = code?.match(new RegExp(`^${prefix}-(\\d+)$`, "i"));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(2, "0")}`;
}
