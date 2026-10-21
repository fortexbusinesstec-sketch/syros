export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

const NO_DATE = "Sin fecha";

export function formatDate(isoDate: string | null): string {
  if (!isoDate) return NO_DATE;
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(isoDate: string | null): string {
  if (!isoDate) return NO_DATE;
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return NO_DATE;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** "1 proyecto", "3 proyectos". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Fecha local de hoy en formato YYYY-MM-DD. */
export function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate.slice(0, 10)}T12:00:00`).getTime();
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
  ).getTime();
  return Math.ceil((target - today) / 86_400_000);
}

export function initialsColor(name: string): string {
  const palettes = [
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  ];
  const index =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    palettes.length;
  return palettes[index];
}
