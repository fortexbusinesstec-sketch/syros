import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

export type SaveState = "saved" | "dirty" | "saving" | "error";

/**
 * Guarda `value` tras `delay` ms sin cambios. Serializa los guardados, avisa al cerrar la
 * pestaña con cambios pendientes y guarda lo pendiente al desmontar. Ctrl/Cmd+S guarda ya.
 */
export function useAutosave(save: (value: string) => Promise<void>, delay = 1500) {
  const [state, setState] = useState<SaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const saveRef = useRef(save);
  const pending = useRef<string | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    if (inflight.current) await inflight.current;
    const value = pending.current;
    if (value === null) return;
    pending.current = null;
    setState("saving");
    inflight.current = saveRef
      .current(value)
      .then(() => {
        setLastSavedAt(new Date());
        setError("");
        setState(pending.current === null ? "saved" : "dirty");
      })
      .catch((caught: unknown) => {
        // Se conserva lo no guardado para reintentar, salvo que ya haya algo más nuevo.
        if (pending.current === null) pending.current = value;
        setError(caught instanceof ApiError ? caught.message : "No se pudo guardar");
        setState("error");
      })
      .finally(() => {
        inflight.current = null;
      });
    await inflight.current;
  }, []);

  const schedule = useCallback(
    (value: string) => {
      pending.current = value;
      setState("dirty");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.current !== null || inflight.current) event.preventDefault();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flush();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
      void flush();
    };
  }, [flush]);

  return { state, lastSavedAt, error, schedule, flush };
}
