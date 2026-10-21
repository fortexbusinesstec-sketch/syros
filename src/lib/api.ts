import { useCallback, useSyncExternalStore } from "react";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Se emite cuando la API responde 401 fuera de /auth: la sesión expiró o se cerró en otro lugar. */
export const AUTH_EXPIRED_EVENT = "processhub:auth-expired";

const REFRESH_INTERVAL = 30_000;
const STALE_AFTER = 5_000;

export async function apiFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      headers:
        init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "No hay conexión con el servidor");
  }

  if (response.status === 401 && !path.startsWith("/auth/")) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      message = ((await response.json()) as { error?: string }).error ?? message;
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

interface Snapshot<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
}

interface Entry {
  snapshot: Snapshot<unknown>;
  fetchedAt: number;
  inflight?: Promise<void>;
  listeners: Set<() => void>;
}

const IDLE: Snapshot<never> = { data: undefined, error: undefined, loading: false };
const entries = new Map<string, Entry>();

function entryFor(path: string): Entry {
  let entry = entries.get(path);
  if (!entry) {
    entry = {
      snapshot: { data: undefined, error: undefined, loading: true },
      fetchedAt: 0,
      listeners: new Set(),
    };
    entries.set(path, entry);
  }
  return entry;
}

function update(entry: Entry, patch: Partial<Snapshot<unknown>>) {
  entry.snapshot = { ...entry.snapshot, ...patch };
  entry.listeners.forEach((listener) => listener());
}

function revalidate(path: string): Promise<void> {
  const entry = entryFor(path);
  if (!entry.inflight) {
    entry.inflight = apiFetch<unknown>(path)
      .then((data) => update(entry, { data, error: undefined, loading: false }))
      .catch((error: unknown) =>
        update(entry, {
          error: error instanceof ApiError ? error : new ApiError(0, String(error)),
          loading: false,
        }),
      )
      .finally(() => {
        entry.fetchedAt = Date.now();
        entry.inflight = undefined;
      });
  }
  return entry.inflight;
}

/** Vuelve a pedir todas las rutas en uso que empiecen por `prefix` y descarta las que nadie está mirando. */
export function invalidate(prefix = ""): Promise<void> {
  const pending: Promise<void>[] = [];
  for (const [path, entry] of entries) {
    if (!path.startsWith(prefix)) continue;
    if (entry.listeners.size) pending.push(revalidate(path));
    else entries.delete(path);
  }
  return Promise.all(pending).then(() => undefined);
}

export function clearCache() {
  entries.clear();
}

let autoRefreshStarted = false;

function startAutoRefresh() {
  if (autoRefreshStarted) return;
  autoRefreshStarted = true;
  const refresh = () => {
    if (document.visibilityState === "visible") void invalidate();
  };
  window.setInterval(refresh, REFRESH_INTERVAL);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
}

/** Lee una ruta de la API. Comparte caché entre componentes y se mantiene al día sola. */
export function useApi<T>(path: string | null) {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!path) return () => {};
      startAutoRefresh();
      const entry = entryFor(path);
      entry.listeners.add(listener);
      if (Date.now() - entry.fetchedAt > STALE_AFTER) void revalidate(path);
      return () => {
        entry.listeners.delete(listener);
      };
    },
    [path],
  );
  const getSnapshot = useCallback(
    () => (path ? entryFor(path).snapshot : IDLE),
    [path],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot) as Snapshot<T>;
  const reload = useCallback(() => (path ? revalidate(path) : Promise.resolve()), [path]);
  return { ...snapshot, reload };
}

/** Escribe en la API y espera a que todas las vistas abiertas se refresquen. */
export async function mutate<T = unknown>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const result = await apiFetch<T>(path, { method, body });
  await invalidate();
  return result;
}
