import { useState } from "react";
import { Dropdown } from "@heroui/react";
import { AlarmClock, Bell, CalendarClock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApi } from "@/lib/api";
import { cn, daysUntil } from "@/lib/utils";
import type { TaskReminder } from "@/types";

/** Alertas reales: tareas pendientes vencidas o que vencen hoy o mañana. */
function buildAlerts(reminders: TaskReminder[]) {
  return reminders
    .filter((task) => task.status !== "Completado" && task.due_date)
    .map((task) => ({ task, remaining: daysUntil(task.due_date!) }))
    .filter(({ remaining }) => remaining <= 1)
    .map(({ task, remaining }) => ({
      id: task.id,
      title: remaining < 0 ? "Tarea vencida" : remaining === 0 ? "Vence hoy" : "Vence mañana",
      description: task.project_name ? `${task.title} · ${task.project_name}` : task.title,
      overdue: remaining < 0,
    }));
}

export function NotificationsMenu() {
  const { data } = useApi<TaskReminder[]>("/reminders");
  const navigate = useNavigate();
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const alerts = buildAlerts(data ?? []);
  const unread = alerts.filter((item) => !seen.has(item.id)).length;

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`}
        className="relative grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-default hover:text-foreground"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-50" />
            <span className="relative inline-flex size-2 rounded-full bg-brand ring-2 ring-surface" />
          </span>
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover className="w-[330px]">
        {alerts.length ? (
          <Dropdown.Menu
            onAction={(key) => {
              setSeen((current) => new Set(current).add(String(key)));
              navigate("/tasks");
            }}
          >
            {alerts.map((item) => {
              const Icon = item.overdue ? AlarmClock : CalendarClock;
              return (
                <Dropdown.Item
                  key={item.id}
                  id={item.id}
                  textValue={item.title}
                  className="items-start py-2.5"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                      item.overdue
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[12px] font-semibold">
                        {item.title}
                      </span>
                      {!seen.has(item.id) && (
                        <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                      )}
                    </span>
                    <span className="line-clamp-2 text-[11px] font-normal leading-relaxed text-muted">
                      {item.description}
                    </span>
                  </span>
                </Dropdown.Item>
              );
            })}
          </Dropdown.Menu>
        ) : (
          <p className="px-4 py-6 text-center text-[11.5px] text-muted">
            No hay tareas vencidas ni por vencer.
          </p>
        )}
      </Dropdown.Popover>
    </Dropdown>
  );
}
