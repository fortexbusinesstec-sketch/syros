import { useMemo, useState } from "react";
import { Button, Chip, Dropdown } from "@heroui/react";
import {
  ArrowRightLeft,
  CalendarDays,
  ChevronDown,
  Columns3,
  Pencil,
  Plus,
  Rocket,
  SquareKanban,
  Users,
} from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateMessage";
import { RecordFormModal, type FieldDef } from "@/components/records/RecordFormModal";
import { toFormValues, useRecordModal } from "@/components/records/helpers";
import { useCurrentUser } from "@/context/useAuth";
import { mutate, useApi } from "@/lib/api";
import { KANBAN_LABELS } from "@/lib/constants";
import { cn, formatShortDate, getInitials, initialsColor, plural } from "@/lib/utils";
import { KANBAN_STATUSES, PRIORITIES, SPRINT_STATUSES } from "@/types/domain";
import type { KanbanStatus, Project, Sprint, SprintTask } from "@/types";

const kanbanColumns: { key: string; label: string; dot: string; statuses: KanbanStatus[] }[] = [
  { key: "todo", label: KANBAN_LABELS["To Do"], dot: "bg-slate-400", statuses: ["Backlog", "To Do"] },
  { key: "doing", label: KANBAN_LABELS["In Progress"], dot: "bg-blue-500", statuses: ["In Progress"] },
  { key: "review", label: KANBAN_LABELS.Review, dot: "bg-amber-500", statuses: ["Review"] },
  { key: "blocked", label: KANBAN_LABELS.Blocked, dot: "bg-rose-500", statuses: ["Blocked"] },
  { key: "done", label: KANBAN_LABELS.Done, dot: "bg-emerald-500", statuses: ["Done"] },
];

const SPRINT_FIELDS: FieldDef[] = [
  { name: "name", label: "Nombre", kind: "text", required: true, placeholder: "Ej. Sprint 1" },
  { name: "status", label: "Estado", kind: "select", options: SPRINT_STATUSES, required: true },
  { name: "start_date", label: "Inicio", kind: "date" },
  { name: "end_date", label: "Fin", kind: "date" },
  { name: "goal", label: "Objetivo", kind: "textarea", rows: 2 },
];

function taskFields(sprints: Sprint[]): FieldDef[] {
  return [
    { name: "title", label: "Tarea", kind: "text", required: true, wide: true },
    {
      name: "sprint_id",
      label: "Sprint",
      kind: "select",
      required: true,
      options: sprints.map((sprint) => ({ value: sprint.id, label: sprint.name })),
    },
    {
      name: "kanban_status",
      label: "Columna",
      kind: "select",
      required: true,
      options: KANBAN_STATUSES.map((status) => ({ value: status, label: KANBAN_LABELS[status] })),
    },
    { name: "priority", label: "Prioridad", kind: "select", options: PRIORITIES, required: true },
    { name: "due_date", label: "Fecha límite", kind: "date" },
    { name: "assignee", label: "Responsable", kind: "text" },
    { name: "tag", label: "Etiqueta", kind: "text", placeholder: "Ej. Integración" },
    { name: "description", label: "Descripción", kind: "textarea", rows: 3 },
  ];
}

export function KanbanTab({ project }: { project: Project }) {
  const user = useCurrentUser();
  const sprintsQuery = useApi<Sprint[]>(`/projects/${project.id}/sprints`);
  const tasksQuery = useApi<SprintTask[]>(`/projects/${project.id}/tasks`);
  const [chosenSprintId, setChosenSprintId] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const sprintModal = useRecordModal<Sprint>();
  const taskModal = useRecordModal<SprintTask>();

  const sprints = useMemo(() => sprintsQuery.data ?? [], [sprintsQuery.data]);
  const selectedSprint =
    sprints.find((sprint) => sprint.id === chosenSprintId) ??
    sprints.find((sprint) => sprint.status === "Activo") ??
    sprints[0];
  const sprintId = selectedSprint?.id ?? "";

  const tasks = useMemo(
    () =>
      (tasksQuery.data ?? []).filter(
        (task) => task.sprint_id === sprintId && (!onlyMine || task.assignee === user.name),
      ),
    [onlyMine, sprintId, tasksQuery.data, user.name],
  );

  const error = sprintsQuery.error ?? tasksQuery.error;
  if (error && (!sprintsQuery.data || !tasksQuery.data)) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void sprintsQuery.reload();
          void tasksQuery.reload();
        }}
      />
    );
  }
  if (!sprintsQuery.data || !tasksQuery.data) return <LoadingState />;

  const saveSprint = async (values: Record<string, string | null>) => {
    if (sprintModal.record) {
      await mutate("PATCH", `/sprints/${sprintModal.record.id}`, values);
    } else {
      const { id } = await mutate<{ id: string }>("POST", "/sprints", { ...values, project_id: project.id });
      setChosenSprintId(id);
    }
  };

  const saveTask = async (values: Record<string, string | null>) => {
    if (taskModal.record) await mutate("PATCH", `/sprint-tasks/${taskModal.record.id}`, values);
    else await mutate("POST", "/sprint-tasks", values);
  };

  const moveTask = (task: SprintTask, status: KanbanStatus) =>
    void mutate("PATCH", `/sprint-tasks/${task.id}`, { kanban_status: status });

  const newSprint = () =>
    sprintModal.openNew({ name: `Sprint ${sprints.length + 1}`, status: sprints.length ? "Planificado" : "Activo" });

  const newTask = (status: KanbanStatus = "To Do") =>
    taskModal.openNew({ sprint_id: sprintId, kanban_status: status, priority: "Media", assignee: user.name });

  const modals = (
    <>
      <RecordFormModal
        key={`sprint-${sprintModal.key}`}
        isOpen={sprintModal.open}
        onOpenChange={sprintModal.setOpen}
        icon={Rocket}
        title={sprintModal.record ? "Editar sprint" : "Nuevo sprint"}
        subtitle={project.name}
        fields={SPRINT_FIELDS}
        initialValues={
          sprintModal.record
            ? toFormValues(sprintModal.record, SPRINT_FIELDS.map((field) => field.name))
            : sprintModal.preset
        }
        submitLabel={sprintModal.record ? "Guardar cambios" : "Crear sprint"}
        onSubmit={saveSprint}
        deleteLabel="Eliminar sprint y sus tareas"
        onDelete={
          sprintModal.record
            ? () =>
                mutate("DELETE", `/sprints/${sprintModal.record!.id}`).then(() => setChosenSprintId(null))
            : undefined
        }
      />
      <RecordFormModal
        key={`task-${taskModal.key}`}
        isOpen={taskModal.open}
        onOpenChange={taskModal.setOpen}
        icon={SquareKanban}
        title={taskModal.record ? "Editar tarea" : "Nueva tarea"}
        subtitle={project.name}
        fields={taskFields(sprints)}
        initialValues={
          taskModal.record
            ? toFormValues(taskModal.record, taskFields(sprints).map((field) => field.name))
            : taskModal.preset
        }
        submitLabel={taskModal.record ? "Guardar cambios" : "Crear tarea"}
        onSubmit={saveTask}
        onDelete={
          taskModal.record
            ? () => mutate("DELETE", `/sprint-tasks/${taskModal.record!.id}`).then(() => undefined)
            : undefined
        }
      />
    </>
  );

  if (!selectedSprint) {
    return (
      <>
        <EmptyState
          icon={Columns3}
          title="Este proyecto aún no tiene sprints"
          description="Crea un sprint para empezar a organizar las tareas en el tablero."
          action={
            <Button variant="primary" size="sm" onPress={newSprint} className="h-8 gap-1.5 rounded-lg text-[11px]">
              <Plus className="size-3.5" />
              Crear primer sprint
            </Button>
          }
        />
        {modals}
      </>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-semibold tracking-[-0.015em]">{selectedSprint.name}</h2>
            <Chip size="sm" variant="soft" color={selectedSprint.status === "Activo" ? "success" : "default"}>
              {selectedSprint.status}
            </Chip>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="Editar sprint"
              onPress={() => sprintModal.openEdit(selectedSprint)}
              className="size-7 rounded-md text-muted"
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
          {selectedSprint.goal && <p className="mt-1 max-w-2xl text-[11px] text-muted">{selectedSprint.goal}</p>}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={onlyMine ? "primary" : "secondary"}
            onPress={() => setOnlyMine((value) => !value)}
            className="h-8 rounded-lg text-[10.5px]"
          >
            Solo mis tareas
          </Button>
          <Dropdown>
            <Dropdown.Trigger className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-[10.5px] font-medium transition-colors hover:bg-surface-secondary">
              Sprints ({sprints.length})
              <ChevronDown className="size-3.5 text-muted" />
            </Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={[sprintId]}
                onAction={(key) => (key === "__new__" ? newSprint() : setChosenSprintId(String(key)))}
              >
                {[
                  ...sprints.map((sprint) => (
                    <Dropdown.Item key={sprint.id} id={sprint.id} textValue={sprint.name}>
                      <span className="flex flex-col">
                        <span className="text-[11px] font-medium">{sprint.name}</span>
                        <span className="text-[9.5px] text-muted">
                          {sprint.status} · {formatShortDate(sprint.start_date)} – {formatShortDate(sprint.end_date)}
                        </span>
                      </span>
                      <Dropdown.ItemIndicator />
                    </Dropdown.Item>
                  )),
                  <Dropdown.Item key="__new__" id="__new__" textValue="Nuevo sprint">
                    <Plus className="size-3.5 text-brand" />
                    <span className="text-[11px] font-medium text-brand">Nuevo sprint</span>
                  </Dropdown.Item>,
                ]}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
          <Button variant="primary" size="sm" onPress={() => newTask()} className="h-8 gap-1.5 rounded-lg text-[10.5px]">
            <Plus className="size-3.5" />
            Nueva tarea
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/70 bg-surface-secondary/40 px-3 py-2 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3" />
          {formatShortDate(selectedSprint.start_date)} – {formatShortDate(selectedSprint.end_date)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Columns3 className="size-3" />
          {plural(tasks.length, "tarea")} en el tablero
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3" />
          {plural(project.team.length, "integrante")}
        </span>
      </div>

      <div className="app-scrollbar mt-4 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2.5">
          {kanbanColumns.map((column) => {
            const columnTasks = tasks.filter((task) => column.statuses.includes(task.kanban_status));
            return (
              <div
                key={column.key}
                className="w-[236px] shrink-0 rounded-xl border border-border/70 bg-surface-secondary/35 p-2.5"
              >
                <div className="flex items-center justify-between px-1 py-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", column.dot)} />
                    <span className="text-[10.5px] font-semibold">{column.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-muted">
                      {columnTasks.length}
                    </span>
                    <Button
                      isIconOnly
                      variant="ghost"
                      size="sm"
                      aria-label={`Nueva tarea en ${column.label}`}
                      onPress={() => newTask(column.statuses[column.statuses.length - 1])}
                      className="size-6 min-w-6 rounded-md text-muted"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-1.5 space-y-2">
                  {columnTasks.map((task) => {
                    const isDone = task.kanban_status === "Done";
                    const isBlocked = task.kanban_status === "Blocked";
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "rounded-lg border border-border/80 bg-surface p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:border-border-secondary",
                          isDone && "opacity-70",
                          isBlocked && "border-rose-200/70 dark:border-rose-500/25",
                        )}
                      >
                        <button type="button" onClick={() => taskModal.openEdit(task)} className="block w-full text-left">
                          <span className="flex items-center justify-between gap-2">
                            {task.tag ? (
                              <span className="truncate rounded bg-surface-secondary px-1.5 py-0.5 text-[8.5px] font-semibold text-muted">
                                {task.tag}
                              </span>
                            ) : (
                              <span />
                            )}
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[8.5px] font-medium",
                                task.priority === "Alta"
                                  ? "text-rose-600 dark:text-rose-400"
                                  : task.priority === "Media"
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-muted",
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  task.priority === "Alta"
                                    ? "bg-rose-500"
                                    : task.priority === "Media"
                                      ? "bg-amber-500"
                                      : "bg-sky-500",
                                )}
                              />
                              {task.priority}
                            </span>
                          </span>
                          <span className="mt-2 line-clamp-2 block text-[11px] font-medium leading-snug">{task.title}</span>
                          {task.description && (
                            <span className="mt-1 line-clamp-2 block text-[9.5px] leading-relaxed text-muted">
                              {task.description}
                            </span>
                          )}
                        </button>

                        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
                          <span className="inline-flex items-center gap-1 text-[9px] text-muted">
                            <CalendarDays className="size-2.5" />
                            {formatShortDate(task.due_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Dropdown>
                              <Dropdown.Trigger
                                aria-label={`Mover ${task.title}`}
                                className="grid size-6 place-items-center rounded-md text-muted transition-colors hover:bg-default hover:text-foreground"
                              >
                                <ArrowRightLeft className="size-3" />
                              </Dropdown.Trigger>
                              <Dropdown.Popover>
                                <Dropdown.Menu
                                  selectionMode="single"
                                  selectedKeys={[task.kanban_status]}
                                  onAction={(key) => moveTask(task, String(key) as KanbanStatus)}
                                >
                                  {KANBAN_STATUSES.map((status) => (
                                    <Dropdown.Item key={status} id={status} textValue={KANBAN_LABELS[status]}>
                                      <span className="text-[11px]">{KANBAN_LABELS[status]}</span>
                                      <Dropdown.ItemIndicator />
                                    </Dropdown.Item>
                                  ))}
                                </Dropdown.Menu>
                              </Dropdown.Popover>
                            </Dropdown>
                            {task.assignee && (
                              <span
                                title={task.assignee}
                                className={cn(
                                  "grid size-5 place-items-center rounded-full text-[7.5px] font-semibold",
                                  initialsColor(task.assignee),
                                )}
                              >
                                {getInitials(task.assignee)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/80 px-2 py-6 text-center text-[9.5px] text-muted/70">
                      Sin tareas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {modals}
    </div>
  );
}
