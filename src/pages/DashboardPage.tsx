import { useMemo, useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  FileCheck2,
  FileText,
  FolderKanban,
  ListTodo,
  Plus,
  Rocket,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/StateMessage";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewProjectModal } from "@/components/projects/NewProjectModal";
import { useCurrentUser } from "@/context/useAuth";
import { useProjects } from "@/context/useProjects";
import { useApi } from "@/lib/api";
import { PRIORITY_META } from "@/lib/constants";
import {
  cn,
  daysUntil,
  formatDateTime,
  formatShortDate,
  plural,
  todayIso,
} from "@/lib/utils";
import type { ProjectDocument, Summary, TaskReminder } from "@/types";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dueLabel(dueDate: string | null) {
  if (!dueDate) return "Sin fecha";
  const remaining = daysUntil(dueDate);
  if (remaining < 0) return "Vencida";
  if (remaining === 0) return "Vence hoy";
  if (remaining === 1) return "Vence mañana";
  return `Vence en ${remaining} días`;
}

export function DashboardPage() {
  const user = useCurrentUser();
  const { projects, loading, error, reload } = useProjects();
  const summary = useApi<Summary>(`/summary?today=${todayIso()}`);
  const reminders = useApi<TaskReminder[]>("/reminders");
  const recentDocuments = useApi<ProjectDocument[]>("/documents/recent");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const dateLabel = useMemo(
    () =>
      capitalize(
        new Intl.DateTimeFormat("es-PE", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date()),
      ),
    [],
  );

  const counts = summary.data;
  const pendingTasks = (reminders.data ?? []).filter(
    (task) => task.status !== "Completado",
  );
  const priorityTasks = pendingTasks.slice(0, 4);
  const latestDocuments = (recentDocuments.data ?? []).slice(0, 4);
  const milestone = counts?.next_milestone;
  const kpi = (value: number | undefined) =>
    value === undefined ? "–" : String(value);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={dateLabel}
        title={`${getGreeting()}, ${user.name.split(" ")[0]}`}
        description="Este es el pulso de tu portafolio. Revisa el avance de los proyectos, las tareas críticas y la documentación."
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

      <section
        aria-label="Indicadores principales"
        className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Proyectos totales"
          value={kpi(counts?.projects.total)}
          helper={`${counts?.projects.active ?? 0} activos en este momento`}
          icon={FolderKanban}
          tone="blue"
        />
        <KpiCard
          label="Sprints activos"
          value={kpi(counts?.sprints.active)}
          helper="Sprints con estado Activo"
          icon={Rocket}
          tone="emerald"
        />
        <KpiCard
          label="Tareas pendientes"
          value={kpi(counts?.reminders.open)}
          helper={`${counts?.reminders.high ?? 0} con prioridad alta`}
          icon={ListTodo}
          tone="amber"
          trend={
            counts?.reminders.overdue
              ? {
                  label: plural(counts.reminders.overdue, "vencida"),
                  direction: "down",
                }
              : undefined
          }
        />
        <KpiCard
          label="Docs recientes"
          value={kpi(counts?.documents.recent)}
          helper={`Actualizados en los últimos 7 días · ${counts?.documents.total ?? 0} en total`}
          icon={FileText}
          tone="violet"
        />
      </section>

      <section aria-labelledby="projects-heading">
        <div className="mb-3.5 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="projects-heading"
                className="text-[16px] font-semibold tracking-[-0.02em]"
              >
                Proyectos
              </h2>
              <span className="rounded-md bg-default px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
                {projects.length}
              </span>
            </div>
            <p className="mt-0.5 text-[11.5px] text-muted">
              Los más recientes de tu portafolio
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => navigate("/projects")}
            className="h-8 gap-1.5 rounded-lg px-2.5 text-[11.5px] font-medium text-muted"
          >
            Ver todos
            <ArrowRight className="size-3.5" />
          </Button>
        </div>

        {error && !projects.length ? (
          <ErrorState error={error} onRetry={() => void reload()} />
        ) : loading && !projects.length ? (
          <LoadingState />
        ) : projects.length ? (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {projects.slice(0, 6).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
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
        )}
      </section>

      <div className="grid gap-3.5 xl:grid-cols-[1.15fr_1fr]">
        <Card className="border border-border/80 bg-surface shadow-none">
          <Card.Header className="flex flex-row items-start justify-between gap-3 p-5 pb-0">
            <div>
              <Card.Title className="text-[14px] font-semibold tracking-[-0.015em]">
                Tareas prioritarias
              </Card.Title>
              <Card.Description className="mt-1 text-[11px] text-muted">
                Pendientes ordenadas por fecha de vencimiento
              </Card.Description>
            </div>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="Ver todas las tareas"
              onPress={() => navigate("/tasks")}
              className="size-8 rounded-lg text-muted"
            >
              <ArrowUpRight className="size-4" />
            </Button>
          </Card.Header>
          <Card.Content className="p-5 pt-4">
            {reminders.error && !reminders.data ? (
              <ErrorState
                error={reminders.error}
                onRetry={() => void reminders.reload()}
                className="py-8"
              />
            ) : reminders.loading && !reminders.data ? (
              <LoadingState className="py-8" />
            ) : priorityTasks.length ? (
              <div className="divide-y divide-border/70">
                {priorityTasks.map((task) => {
                  const priority = PRIORITY_META[task.priority];
                  const remaining = task.due_date
                    ? daysUntil(task.due_date)
                    : Infinity;

                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-8 w-1 shrink-0 rounded-full",
                          priority.bar,
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium leading-snug">
                          {task.title}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 truncate text-[10.5px] text-muted">
                          <span className="truncate">
                            {task.project_name ?? "Sin proyecto"}
                          </span>
                          <span className="text-muted/40">·</span>
                          <CalendarClock className="size-3 shrink-0" />
                          <span
                            className={cn(
                              "shrink-0",
                              remaining <= 1 &&
                                "font-medium text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {dueLabel(task.due_date)}
                          </span>
                        </p>
                      </div>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={priority.chip}
                        className="mt-0.5 shrink-0"
                      >
                        {task.priority}
                      </Chip>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={ListTodo}
                title="No hay tareas pendientes"
                className="py-8"
              />
            )}
            <Button
              variant="secondary"
              fullWidth
              size="sm"
              onPress={() => navigate("/tasks")}
              className="mt-4 h-9 rounded-lg text-[11.5px]"
            >
              Ver todas las tareas
              <ArrowRight className="size-3.5" />
            </Button>
          </Card.Content>
        </Card>

        <Card className="border border-border/80 bg-surface shadow-none">
          <Card.Header className="flex flex-row items-start justify-between gap-3 p-5 pb-0">
            <div>
              <Card.Title className="text-[14px] font-semibold tracking-[-0.015em]">
                Documentos recientes
              </Card.Title>
              <Card.Description className="mt-1 text-[11px] text-muted">
                Actualizados en los últimos 7 días
              </Card.Description>
            </div>
            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-brand dark:bg-brand/15 dark:text-blue-300">
              {recentDocuments.data?.length ?? 0}
            </span>
          </Card.Header>
          <Card.Content className="p-5 pt-4">
            {recentDocuments.error && !recentDocuments.data ? (
              <ErrorState
                error={recentDocuments.error}
                onRetry={() => void recentDocuments.reload()}
                className="py-8"
              />
            ) : recentDocuments.loading && !recentDocuments.data ? (
              <LoadingState className="py-8" />
            ) : latestDocuments.length ? (
              <div className="divide-y divide-border/70">
                {latestDocuments.map((document) => (
                  <button
                    type="button"
                    key={document.id}
                    onClick={() =>
                      navigate(`/projects/${document.project_id}/docs/${document.id}`)
                    }
                    className="flex w-full items-start gap-3 py-3 text-left first:pt-0 last:pb-0"
                  >
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-border/80 bg-surface-secondary/60 text-muted">
                      <FileCheck2 className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium leading-snug">
                        {document.name}
                      </span>
                      <span className="mt-1 block truncate text-[10.5px] text-muted">
                        {document.project_name} ·{" "}
                        {formatDateTime(document.updated_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 shrink-0 rounded border border-border/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted">
                      {document.status}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="Sin documentos esta semana"
                className="py-8"
              />
            )}
            {milestone && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-surface-secondary/40 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2 text-[10.5px] text-muted">
                  <CalendarClock className="size-3.5 shrink-0" />
                  <span className="truncate">
                    Próximo hito:{" "}
                    <span className="font-medium text-foreground">
                      {formatShortDate(milestone.date)}
                    </span>{" "}
                    · {milestone.label}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => navigate(`/projects/${milestone.project_id}`)}
                  className="h-7 shrink-0 rounded-md px-2 text-[10.5px] text-brand"
                >
                  Ver proyecto
                </Button>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      <NewProjectModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
