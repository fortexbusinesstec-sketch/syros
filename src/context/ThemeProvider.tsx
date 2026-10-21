import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import {
  ThemeContext,
  type ResolvedTheme,
  type ThemeMode,
} from "@/context/theme-context";

const THEME_KEY = "processhub-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function subscribeToSystemTheme(onChange: () => void) {
  const mediaQuery = window.matchMedia(DARK_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  const isDark = theme === "dark";

  root.classList.toggle("dark", isDark);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", isDark ? "#090b0f" : "#0066cc");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme);
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    () => "light" as const,
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : theme;

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    window.localStorage.setItem(THEME_KEY, nextTheme);
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    window.localStorage.setItem(THEME_KEY, nextTheme);
    setThemeState(nextTheme);
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
