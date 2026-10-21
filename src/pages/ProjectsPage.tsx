import { useMemo, useState } from "react";
import {
  Button,
  Dropdown,
  SearchField,
} from "@heroui/react";
import {
  ArrowDownUp,
  ChevronDown,
  FolderKanban,
  FolderSearch,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/StateMessage";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewProjectModal } from "@/components/projects/NewProjectModal";
import { useProjects } from "@/context/useProjects";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

type FilterKey = "Todos" | ProjectStatus;
type SortKey = "recent" | "name" | "progress";

const filters: FilterKey[] = ["Todos", "Activo", "En Pausa", "Cerrado"];

const sortLabels: Record<SortKey, string> = {
  recent: "Más recientes",
  name: "Nombre A–Z",
  progress: "Mayor avance",
};

export function ProjectsPage() {
  const { projects, loading, error, reload } = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("Todos");
  const [sort, setSort] = useState<SortKey>("recent");
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const result = projects.filter((project) => {
      const matchesStatus = filter === "Todos" || project.status === filter;
      const matchesQuery =
        !normalizedQuery ||
        [
          project.name,
          project.description ?? "",
          project.current_phase,
          project.owner ?? "",
          ...project.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });

    return result.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "es");
      if (sort === "progress") return b.progress - a.progress;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [filter, projects, query, sort]);

  const statusCounts = useMemo(
    () => ({
      Todos: projects.length,
      Activo: projects.filter((project) => project.status === "Activo").length,
      "En Pausa": projects.filter((project) => project.status === "En Pausa")
        .length,
      Cerrado: projects.filter((project) => project.status === "Cerrado")
        .length,
    }),
    [projects],
  );

  const clearFilters = () => {
    setFilter("Todos");
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Portafolio"
        title="Proyectos"
        description="Gestiona las iniciativas de automatización y procesos del equipo, desde el descubrimiento hasta el cierre."
        actions={
          <Button
            variant="primary"
            onPress={() => setIsModalOpen(true)}
            className="h-10 gap-2 rounded-lg px-4 text-[12.5px] font-semibold shadow-[0_8px_20px_-10px_rgba(0,102,204,0.8)]"
          >
            <Plus className="size-4" />
            Nuevo proyecto
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-surface p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="app-scrollbar flex items-center gap-1 overflow-x-auto">
          {filters.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={filter === item ? "primary" : "ghost"}
              onPress={() => setFilter(item)}
              className={cn(
                "h-8 shrink-0 rounded-lg px-3 text-[11px] font-medium",
                filter !== item && "text-muted",
              )}
            >
              {item}
              <span
                className={cn(
                  "ml-1 rounded px-1 text-[9.5px] font-semibold tabular-nums",
                  filter === item
                    ? "bg-white/15 text-white"
                    : "bg-default text-muted",
                )}
              >
                {statusCounts[item]}
              </span>
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-[260px]">
            <SearchField
              aria-label="Buscar proyectos"
              variant="secondary"
              value={query}
              onChange={(value) => {
                if (value) {
                  setSearchParams({ q: value }, { replace: true });
                } else {
                  setSearchParams({}, { replace: true });
                }
              }}
            >
              <SearchField.Group className="h-9 rounded-lg">
                <SearchField.SearchIcon>
                  <Search className="size-4" />
                </SearchField.SearchIcon>
                <SearchField.Input
                  placeholder="Buscar en el portafolio..."
                  className="text-[12px]"
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>

          <Dropdown>
            <Dropdown.Trigger className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[11.5px] font-medium transition-colors hover:bg-surface-secondary">
            
              <ArrowDownUp className="size-3.5 text-muted" />
              {sortLabels[sort]}
              <ChevronDown className="size-3.5 text-muted" />
            </Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu
                onAction={(key) => setSort(key as SortKey)}
                selectedKeys={[sort]}
                selectionMode="single"
              >
                <Dropdown.Item id="recent" textValue="Más recientes">
                  Más recientes
                  <Dropdown.ItemIndicator />
                </Dropdown.Item>
                <Dropdown.Item id="name" textValue="Nombre A–Z">
                  Nombre A–Z
                  <Dropdown.ItemIndicator />
                </Dropdown.Item>
                <Dropdown.Item id="progress" textValue="Mayor avance">
                  Mayor avance
                  <Dropdown.ItemIndicator />
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] text-muted" aria-live="polite">
          Mostrando{" "}
          <span className="font-semibold text-foreground">
            {filteredProjects.length}
          </span>{" "}
          de {projects.length} proyectos
          {query && (
            <>
              {" "}
              para <span className="font-medium">“{query}”</span>
            </>
          )}
        </p>
        {(query || filter !== "Todos") && (
          <Button
            variant="ghost"
            size="sm"
            onPress={clearFilters}
            className="h-7 gap-1 rounded-md px-2 text-[10.5px] text-muted"
          >
            <X className="size-3" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {error && !projects.length ? (
        <ErrorState error={error} onRetry={() => void reload()} />
      ) : loading && !projects.length ? (
        <LoadingState />
      ) : !projects.length ? (
        <EmptyState
          icon={FolderKanban}
          title="Aún no hay proyectos"
          description="Crea el primero para empezar a registrar fases, documentos y tareas."
          action={
            <Button
              variant="primary"
              size="sm"
              onPress={() => setIsModalOpen(true)}
              className="h-8 gap-1.5 rounded-lg text-[11px]"
            >
              <Plus className="size-3.5" />
              Nuevo proyecto
            </Button>
          }
        />
      ) : filteredProjects.length > 0 ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-surface-secondary text-muted">
            <FolderSearch className="size-5" />
          </span>
          <h2 className="mt-4 text-[14px] font-semibold">
            No encontramos proyectos
          </h2>
          <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-muted">
            Prueba con otro término de búsqueda o quita los filtros para ver
            todo el portafolio.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onPress={clearFilters}
            className="mt-4 h-8 rounded-lg text-[11px]"
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      <NewProjectModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
