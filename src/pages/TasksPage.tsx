import { useMemo, useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  ListChecks,
  Plus,
  TriangleAlert,
} from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/StateMessage";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecordFormModal, type FieldDef } from "@/components/records/RecordFormModal";
import { toFormValues, useRecordModal } from "@/components/records/helpers";
import { ApiError, mutate, useApi } from "@/lib/api";
import { PRIORITY_META } from "@/lib/constants";
import { cn, daysUntil, formatShortDate } from "@/lib/utils";
import { PRIORITIES, REMINDER_STATUSES } from "@/types/domain";
import type { Project, ReminderStatus, TaskReminder } from "@/types";

type TaskFilter = "Todas" | "Pendientes" | "Completadas";

const filterOptions: TaskFilter[] = [
  "Todas",
  "Pendientes",
  "Completadas",
];

function taskFields(projects: Project[]): FieldDef[] {
  return [
    { name: "title", label: "Tarea", kind: "text", required: true, wide: true },
    { name: "due_date", label: "Fecha límite", kind: "date" },
    { name: "status", label: "Estado", kind: "select", options: REMINDER_STATUSES, required: true },
    { name: "priority", label: "Prioridad", kind: "select", options: PRIORITIES, required: true },
    {
      name: "project_id",
      label: "Proyecto",
      kind: "select",
      options: projects.map((project) => ({ value: project.id, label: project.name })),
    },
    { name: "description", label: "Descripción", kind: "textarea", rows: 3 },
  ];
}

function dueLabel(task: TaskReminder) {
  if (task.status === "Completado") return "Completada";
  if (!task.due_date) return "Sin fecha";
  const remaining = daysUntil(task.due_date);
  if (remaining < 0) return `Venció hace ${Math.abs(remaining)} días`;
  if (remaining === 0) return "Vence hoy";
  if (remaining === 1) return "Vence mañana";
  return `${formatShortDate(task.due_date)} · en ${remaining} días`;
}

function groupFor(task: TaskReminder) {
  if (task.status === "Completado") return "Completadas";
  if (!task.due_date) return "Sin fecha";
  const remaining = daysUntil(task.due_date);
  if (remaining < 0) return "Vencidas";
  if (remaining <= 1) return "Hoy y mañana";
  if (remaining <= 7) return "Esta semana";
  return "Más adelante";
}

const groupOrder = [
  "Vencidas",
  "Hoy y mañana",
  "Esta semana",
  "Más adelante",
  "Sin fecha",
  "Completadas",
];

export function TasksPage() {
  const { data, loading, error, reload } = useApi<TaskReminder[]>("/reminders");
  const projectsQuery = useApi<Project[]>("/projects");
  const taskModal = useRecordModal<TaskReminder>();
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const fields = useMemo(() => taskFields(projects), [projects]);
  const [filter, setFilter] = useState<TaskFilter>("Todas");
  // Cambios de estado ya enviados que aún no llegan en la siguiente lectura.
  const [optimistic, setOptimistic] = useState<Record<string, ReminderStatus>>({});
  const [toggleError, setToggleError] = useState("");

  const tasks = useMemo(
    () =>
      (data ?? []).map((task) =>
        optimistic[task.id] ? { ...task, status: optimistic[task.id] } : task,
      ),
    [data, optimistic],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === "Pendientes") return task.status !== "Completado";
      if (filter === "Completadas") return task.status === "Completado";
      return true;
    });
  }, [filter, tasks]);

  const groupedTasks = useMemo(() => {
    const groups = new Map<string, TaskReminder[]>();
    for (const task of filteredTasks) {
      const group = groupFor(task);
      const current = groups.get(group) ?? [];
      current.push(task);
      groups.set(group, current);
    }
    return groupOrder
      .filter((group) => groups.has(group))
      .map((group) => ({ group, tasks: groups.get(group) ?? [] }));
  }, [filteredTasks]);

  const openTasks = tasks.filter((task) => task.status !== "Completado");
  const highPriority = openTasks.filter((task) => task.priority === "Alta");
  const completed = tasks.filter((task) => task.status === "Completado");

  const toggleTask = async (task: TaskReminder) => {
    const status: ReminderStatus =
      task.status === "Completado" ? "Pendiente" : "Completado";
    setToggleError("");
    setOptimistic((current) => ({ ...current, [task.id]: status }));
    try {
      await mutate("PATCH", `/reminders/${task.id}`, { status });
    } catch (caught) {
      setToggleError(
        caught instanceof ApiError
          ? caught.message
          : "No se pudo actualizar la tarea.",
      );
    } finally {
      setOptimistic((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
  };

  const saveTask = async (values: Record<string, string | null>) => {
    if (taskModal.record) await mutate("PATCH", `/reminders/${taskModal.record.id}`, values);
    else await mutate("POST", "/reminders", values);
  };

  const newTask = () =>
    taskModal.openNew({ status: "Pendiente", priority: "Media" });

  const modals = (
    <RecordFormModal
      key={`task-${taskModal.key}`}
      isOpen={taskModal.open}
      onOpenChange={taskModal.setOpen}
      icon={ListChecks}
      title={taskModal.record ? "Editar tarea" : "Nueva tarea"}
      subtitle={taskModal.record ? undefined : "Recordatorio o compromiso de seguimiento"}
      fields={fields}
      initialValues={
        taskModal.record
          ? toFormValues(taskModal.record, fields.map((field) => field.name))
          : taskModal.preset
      }
      submitLabel={taskModal.record ? "Guardar cambios" : "Crear tarea"}
      onSubmit={saveTask}
      deleteLabel="Eliminar tarea"
      onDelete={
        taskModal.record
          ? () => mutate("DELETE", `/reminders/${taskModal.record!.id}`).then(() => undefined)
          : undefined
      }
    />
  );

  if (error && !data) {
    return <ErrorState error={error} onRetry={() => void reload()} />;
  }
  if (loading && !data) return <LoadingState />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Seguimiento"
        title="Tareas"
        description="Recordatorios y compromisos vinculados a los proyectos."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface px-2.5 py-1.5 text-[10.5px] text-muted">
              <ListChecks className="size-3.5 text-brand" />
              {openTasks.length} tareas abiertas
            </span>
            <Button
              variant="primary"
              size="sm"
              onPress={newTask}
              className="h-8 gap-1.5 rounded-lg text-[10.5px]"
            >
              <Plus className="size-3.5" />
              Nueva tarea
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border border-border/80 bg-surface shadow-none">
          <Card.Content className="flex items-center gap-3 p-4">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <ListChecks className="size-[18px]" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-muted">
                Abiertas
              </p>
              <p className="text-[20px] font-semibold leading-tight tracking-[-0.03em] tabular-nums">
                {openTasks.length}
              </p>
            </div>
          </Card.Content>
        </Card>
        <Card className="border border-border/80 bg-surface shadow-none">
          <Card.Content className="flex items-center gap-3 p-4">
            <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <TriangleAlert className="size-[18px]" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-muted">
                Prioridad alta
              </p>
              <p className="text-[20px] font-semibold leading-tight tracking-[-0.03em] tabular-nums">
                {highPriority.length}
              </p>
            </div>
          </Card.Content>
        </Card>
        <Card className="border border-border/80 bg-surface shadow-none">
          <Card.Content className="flex items-center gap-3 p-4">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="size-[18px]" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-muted">
                Completadas
              </p>
              <p className="text-[20px] font-semibold leading-tight tracking-[-0.03em] tabular-nums">
                {completed.length}
              </p>
            </div>
          </Card.Content>
        </Card>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-surface p-1 sm:w-fit">
        {filterOptions.map((option) => {
          const count =
            option === "Todas"
              ? tasks.length
              : option === "Pendientes"
                ? openTasks.length
                : completed.length;
          return (
            <Button
              key={option}
              size="sm"
              variant={filter === option ? "primary" : "ghost"}
              onPress={() => setFilter(option)}
              className={cn(
                "h-7 flex-1 rounded-md px-2.5 text-[10.5px] font-medium sm:flex-none",
                filter !== option && "text-muted",
              )}
            >
              {option}
              <span
                className={cn(
                  "ml-1 rounded px-1 text-[9px] font-semibold tabular-nums",
                  filter === option
                    ? "bg-white/15 text-white"
                    : "bg-default text-muted",
                )}
              >
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      {toggleError && (
        <p role="alert" className="text-[11px] text-danger">
          {toggleError}
        </p>
      )}

      {groupedTasks.length > 0 ? (
        <div className="space-y-5">
          {groupedTasks.map(({ group, tasks: groupTasks }) => (
            <section key={group}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {group}
                </h2>
                <span className="rounded bg-default px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-muted">
                  {groupTasks.length}
                </span>
              </div>

              <Card className="border border-border/80 bg-surface shadow-none">
                <Card.Content className="divide-y divide-border/70 p-0">
                  {groupTasks.map((task) => {
                    const priority =
                      PRIORITY_META[task.priority] ?? PRIORITY_META.Media;
                    const isDone = task.status === "Completado";
                    const isOverdue =
                      !isDone &&
                      Boolean(task.due_date) &&
                      daysUntil(task.due_date!) < 0;

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-secondary/30",
                          isDone && "opacity-60",
                        )}
                      >
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={
                            isDone
                              ? `Reabrir ${task.title}`
                              : `Completar ${task.title}`
                          }
                          isDisabled={task.id in optimistic}
                          onPress={() => void toggleTask(task)}
                          className="mt-0.5 size-7 shrink-0 rounded-full"
                        >
                          {isDone ? (
                            <CheckCircle2 className="size-[18px] text-emerald-500" />
                          ) : (
                            <Circle className="size-[18px] text-muted/50" />
                          )}
                        </Button>

                        <button
                          type="button"
                          onClick={() => taskModal.openEdit(task)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p
                            className={cn(
                              "text-[12px] font-medium leading-snug",
                              isDone && "line-through",
                            )}
                          >
                            {task.title}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-muted">
                            {task.project_name ?? "Sin proyecto"}
                            {task.status === "En Proceso" && " · En proceso"}
                          </p>
                          {task.description && (
                            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted/80">
                              {task.description}
                            </p>
                          )}
                        </button>

                        <div className="hidden w-[150px] shrink-0 items-center justify-end gap-1.5 text-[10px] text-muted sm:flex">
                          <CalendarClock
                            className={cn(
                              "size-3",
                              isOverdue && "text-rose-500",
                            )}
                          />
                          <span
                            className={cn(
                              isOverdue &&
                                "font-medium text-rose-600 dark:text-rose-400",
                            )}
                          >
                            {dueLabel(task)}
                          </span>
                        </div>

                        <Chip
                          size="sm"
                          variant="soft"
                          color={isDone ? "success" : priority.chip}
                          className="shrink-0"
                        >
                          {isDone ? "Hecha" : task.priority}
                        </Chip>
                      </div>
                    );
                  })}
                </Card.Content>
              </Card>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title={
            tasks.length ? "No hay tareas en este filtro" : "Aún no hay tareas"
          }
          description={
            tasks.length
              ? "Cambia el filtro para revisar el resto de compromisos."
              : "Crea tu primera tarea o recordatorio para empezar el seguimiento."
          }
          action={
            !tasks.length ? (
              <Button
                variant="primary"
                size="sm"
                onPress={newTask}
                className="h-8 gap-1.5 rounded-lg text-[11px]"
              >
                <Plus className="size-3.5" />
                Nueva tarea
              </Button>
            ) : undefined
          }
          className="py-16"
        />
      )}

      {modals}
    </div>
  );
}
