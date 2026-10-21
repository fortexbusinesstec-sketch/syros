import { useState } from "react";
import type { ComponentType } from "react";
import { SharedElementTransition } from "react-aria-components/SharedElementTransition";
import { Button, Card, Chip, Dropdown, Tabs } from "@heroui/react";
import {
  ArrowLeft,
  BookMarked,
  CalendarDays,
  Check,
  ChevronDown,
  Columns3,
  FileText,
  Flag,
  FolderX,
  Gauge,
  Link2,
  LoaderCircle,
  Pencil,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { LoadingState } from "@/components/common/StateMessage";
import { EditProjectModal } from "@/components/projects/EditProjectModal";
import { KanbanTab } from "@/components/projects/KanbanTab";
import { KpisTab } from "@/components/projects/KpisTab";
import { ProjectDocumentation } from "@/components/projects/ProjectDocumentation";
import { RequirementsTab } from "@/components/projects/RequirementsTab";
import { RisksTab } from "@/components/projects/RisksTab";
import { StakeholdersTab } from "@/components/projects/StakeholdersTab";
import { useProjects } from "@/context/useProjects";
import { ApiError, mutate } from "@/lib/api";
import { PHASE_META, PROJECT_PHASES, STATUS_META } from "@/lib/constants";
import { cn, formatDate, getInitials, initialsColor, plural } from "@/lib/utils";
import type { Project, ProjectPhase } from "@/types";

interface TabDef {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: (project: Project) => number;
  Component: ComponentType<{ project: Project }>;
}

const TABS: TabDef[] = [
  { id: "documentacion", label: "Documentación", icon: FileText, count: (p) => p.document_count, Component: ProjectDocumentation },
  { id: "stakeholders", label: "Stakeholders", icon: Users, count: (p) => p.stakeholder_count, Component: StakeholdersTab },
  { id: "requerimientos", label: "Requerimientos", icon: BookMarked, count: (p) => p.requirement_count, Component: RequirementsTab },
  { id: "riesgos", label: "Riesgos", icon: ShieldAlert, count: (p) => p.open_risk_count, Component: RisksTab },
  { id: "kpis", label: "KPIs", icon: Gauge, count: (p) => p.kpi_count, Component: KpisTab },
  { id: "kanban", label: "Tablero Kanban", icon: Columns3, Component: KanbanTab },
];

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, loading } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab = TABS.some((item) => item.id === requestedTab) ? requestedTab! : "documentacion";
  const setTab = (key: string) => setSearchParams({ tab: key }, { replace: true });
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [phasePending, setPhasePending] = useState<ProjectPhase | null>(null);
  const [phaseError, setPhaseError] = useState("");

  const project = projects.find((item) => item.id === projectId);

  if (!project && loading) return <LoadingState className="min-h-[60vh]" />;

  if (!project) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-surface-secondary text-muted">
          <FolderX className="size-6" />
        </span>
        <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.03em]">Proyecto no encontrado</h1>
        <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-muted">
          El proyecto que buscas no existe o fue retirado del portafolio.
        </p>
        <Button variant="primary" onPress={() => navigate("/projects")} className="mt-4 h-9 rounded-lg text-[11.5px]">
          <ArrowLeft className="size-3.5" />
          Volver a proyectos
        </Button>
      </div>
    );
  }

  const phase = PHASE_META[project.current_phase] ?? PHASE_META.Iniciación;
  const status = STATUS_META[project.status] ?? STATUS_META.Activo;

  const changePhase = async (next: ProjectPhase) => {
    if (next === project.current_phase || phasePending) return;
    setPhasePending(next);
    setPhaseError("");
    try {
      await mutate("PATCH", `/projects/${project.id}`, { current_phase: next });
    } catch (error) {
      setPhaseError(error instanceof ApiError ? error.message : "No se pudo cambiar la fase.");
    } finally {
      setPhasePending(null);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onPress={() => navigate("/projects")}
        className="h-8 -translate-x-1 gap-1.5 rounded-lg px-2 text-[10.5px] text-muted"
      >
        <ArrowLeft className="size-3.5" />
        Volver a proyectos
      </Button>

      <Card className="relative overflow-hidden border border-border/80 bg-surface shadow-none">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-[340px] rounded-full bg-brand/[0.07] blur-3xl"
        />
        <Card.Content className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Dropdown>
                  <Dropdown.Trigger
                    aria-label="Cambiar fase del proyecto"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold transition-opacity hover:opacity-80",
                      phase.soft,
                      phase.text,
                    )}
                  >
                    {phasePending ? (
                      <LoaderCircle className="size-3 animate-spin" />
                    ) : (
                      <span className={cn("size-1.5 rounded-full", phase.dot)} />
                    )}
                    {phasePending ?? project.current_phase}
                    <ChevronDown className="size-3" />
                  </Dropdown.Trigger>
                  <Dropdown.Popover>
                    <Dropdown.Menu
                      aria-label="Fases"
                      selectionMode="single"
                      selectedKeys={[project.current_phase]}
                      onAction={(key) => void changePhase(String(key) as ProjectPhase)}
                    >
                      {PROJECT_PHASES.map((item) => (
                        <Dropdown.Item key={item} id={item} textValue={item}>
                          <span className={cn("size-1.5 rounded-full", PHASE_META[item].dot)} />
                          <span className="text-[11.5px]">
                            {PHASE_META[item].step}. {item}
                          </span>
                          <Dropdown.ItemIndicator />
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
                <Chip size="sm" variant="soft" color={status.color}>
                  <span className={cn("size-1.5 rounded-full", status.dot)} />
                  <Chip.Label>{project.status}</Chip.Label>
                </Chip>
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border/80 bg-surface-secondary/50 px-1.5 py-0.5 text-[9px] font-medium text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {phaseError && (
                <p role="alert" className="mt-2 text-[11px] text-danger">
                  {phaseError}
                </p>
              )}

              <h1 className="mt-3 text-balance text-[24px] font-semibold leading-tight tracking-[-0.04em] sm:text-[28px]">
                {project.name}
              </h1>
              <p className="mt-2 max-w-2xl whitespace-pre-line text-[12px] leading-relaxed text-muted">
                {project.description ?? "Sin descripción"}
              </p>

              <div className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-muted/80">Responsable</p>
                  {project.owner ? (
                    <p className="mt-1.5 flex items-center gap-2 text-[11px] font-medium">
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-full text-[8px] font-semibold",
                          initialsColor(project.owner),
                        )}
                      >
                        {getInitials(project.owner)}
                      </span>
                      <span className="truncate">{project.owner}</span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-muted">Sin asignar</p>
                  )}
                </div>
                <div>
                  <p className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-muted/80">Fecha de inicio</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium">
                    <CalendarDays className="size-3.5 text-muted" />
                    {formatDate(project.start_date)}
                  </p>
                </div>
                <div>
                  <p className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-muted/80">Cierre estimado</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium">
                    <Flag className="size-3.5 text-muted" />
                    {formatDate(project.estimated_end_date)}
                  </p>
                </div>
                <div>
                  <p className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-muted/80">Equipo</p>
                  <p className="mt-1.5 flex items-center gap-2 text-[11px] font-medium">
                    <span className="flex -space-x-1.5">
                      {project.team.slice(0, 3).map((member) => (
                        <span
                          key={member}
                          title={member}
                          className={cn(
                            "grid size-6 place-items-center rounded-full text-[8px] font-semibold ring-2 ring-surface",
                            initialsColor(member),
                          )}
                        >
                          {getInitials(member)}
                        </span>
                      ))}
                    </span>
                    <span className="text-muted">{plural(project.team.length, "persona")}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center xl:w-[210px] xl:flex-col xl:items-stretch">
              <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface-secondary/40 p-3">
                <div className="relative size-14 shrink-0">
                  <svg viewBox="0 0 56 56" className="size-14 -rotate-90">
                    <circle cx="28" cy="28" r="23" fill="none" stroke="currentColor" strokeWidth="5" className="text-surface-tertiary" />
                    <circle
                      cx="28"
                      cy="28"
                      r="23"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 23}
                      strokeDashoffset={2 * Math.PI * 23 * (1 - project.progress / 100)}
                      className="text-brand"
                    />
                  </svg>
                  <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold tabular-nums">
                    {project.progress}%
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold">Avance de tareas</p>
                  <p className="mt-0.5 text-[9.5px] text-muted">
                    {project.task_total
                      ? `${plural(project.task_total, "tarea")} · fase ${phase.step} de ${PROJECT_PHASES.length}`
                      : `Sin tareas · fase ${phase.step} de ${PROJECT_PHASES.length}`}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onPress={copyLink} className="h-8 flex-1 gap-1.5 rounded-lg text-[10.5px]">
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Link2 className="size-3.5" />}
                  {copied ? "Copiado" : "Copiar enlace"}
                </Button>
                <Button variant="primary" size="sm" onPress={() => setEditing(true)} className="h-8 flex-1 gap-1.5 rounded-lg text-[10.5px]">
                  <Pencil className="size-3.5" />
                  Editar
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-border/70 pt-4">
            <div className="flex items-center justify-between text-[9.5px]">
              <span className="font-medium text-muted">Ruta del proyecto · haz clic en una fase para moverlo</span>
              <span className="tabular-nums text-muted">
                {phase.step} / {PROJECT_PHASES.length}
              </span>
            </div>
            <div className="mt-2 flex gap-1">
              {PROJECT_PHASES.map((item, index) => {
                const completed = index < phase.step - 1;
                const current = index === phase.step - 1;
                return (
                  <button
                    type="button"
                    key={item}
                    title={`Mover a ${item}`}
                    aria-label={`Mover el proyecto a la fase ${item}`}
                    aria-current={current ? "step" : undefined}
                    disabled={phasePending !== null}
                    onClick={() => void changePhase(item)}
                    className="group flex-1 text-left"
                  >
                    <span
                      className={cn(
                        "block h-1.5 rounded-full transition-colors group-hover:bg-brand/80",
                        completed ? "bg-brand/60" : current ? "bg-brand" : "bg-border",
                      )}
                    />
                    <span
                      className={cn(
                        "mt-1.5 hidden truncate text-[8px] leading-tight group-hover:text-foreground xl:block",
                        current ? "font-semibold text-foreground" : "text-muted/70",
                      )}
                    >
                      {PHASE_META[item].short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card.Content>
      </Card>

      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} variant="secondary" className="w-full">
        <Tabs.ListContainer className="app-scrollbar overflow-x-auto">
          <SharedElementTransition>
            <Tabs.List aria-label="Secciones del proyecto" className="gap-0.5">
              {TABS.map((item) => {
                const Icon = item.icon;
                return (
                  <Tabs.Tab
                    key={item.id}
                    id={item.id}
                    className="w-auto shrink-0 gap-1.5 whitespace-nowrap px-3 text-[12px]"
                  >
                    <Tabs.Indicator />
                    <Icon className="size-3.5" />
                    {item.label}
                    {item.count && (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-surface-secondary px-1 text-[9px] font-semibold leading-none tabular-nums text-muted">
                        {item.count(project)}
                      </span>
                    )}
                  </Tabs.Tab>
                );
              })}
            </Tabs.List>
          </SharedElementTransition>
        </Tabs.ListContainer>

        {TABS.map(({ id, Component }) => (
          <Tabs.Panel key={id} id={id} className="pt-4">
            <Component project={project} />
          </Tabs.Panel>
        ))}
      </Tabs>

      {editing && <EditProjectModal project={project} isOpen={editing} onOpenChange={setEditing} />}
    </div>
  );
}
