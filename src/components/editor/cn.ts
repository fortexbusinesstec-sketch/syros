import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** cn de shadcn (clsx + tailwind-merge), que es lo que espera el código del editor. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
