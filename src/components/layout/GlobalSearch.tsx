import { useEffect, useRef, useState } from "react";
import { SearchField } from "@heroui/react";
import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export function GlobalSearch() {
  const [searchState, setSearchState] = useState({ path: "", value: "" });
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const query =
    searchState.path === location.pathname ? searchState.value : "";

  const setQuery = (value: string) => {
    setSearchState({ path: location.pathname, value });
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate(`/projects?q=${encodeURIComponent(trimmed)}`);
    setSearchState({ path: location.pathname, value: "" });
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full">
      <SearchField
        aria-label="Búsqueda global"
        variant="secondary"
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        className="w-full"
      >
        <SearchField.Group className="h-9 rounded-lg border border-border/80 bg-surface-secondary/70 pe-2 transition-colors focus-within:border-accent/40 focus-within:bg-surface">
          <SearchField.SearchIcon className="ms-1 text-muted">
            <Search className="size-4" />
          </SearchField.SearchIcon>
          <SearchField.Input
            ref={inputRef}
            placeholder="Buscar proyectos, documentos..."
            className="text-[13px]"
          />
          <SearchField.ClearButton />
          {!query && (
            <kbd className="pointer-events-none hidden items-center gap-0.5 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted shadow-xs lg:inline-flex">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          )}
        </SearchField.Group>
      </SearchField>
    </div>
  );
}
