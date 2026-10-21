import { Avatar, Button } from "@heroui/react";
import {
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  Sparkles,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Brand } from "@/components/layout/Brand";
import { navGroups } from "@/components/layout/navigation";
import { useCurrentUser } from "@/context/useAuth";
import { useApi } from "@/lib/api";
import { cn, getInitials, plural, todayIso } from "@/lib/utils";
import type { Summary } from "@/types";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const user = useCurrentUser();
  const summary = useApi<Summary>(`/summary?today=${todayIso()}`);
  const badges = {
    projects: summary.data?.projects.total,
    openTasks: summary.data?.reminders.open,
  };
  const synced = Boolean(summary.data) && !summary.error;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-dvh w-[276px] shrink-0 flex-col border-r border-border bg-surface transition-[width,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:static lg:z-auto lg:translate-x-0",
        mobileOpen
          ? "translate-x-0 shadow-2xl"
          : "-translate-x-full lg:shadow-none",
        collapsed ? "lg:w-[78px]" : "lg:w-[276px]",
      )}
      aria-label="Navegación principal"
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border/80 px-4",
          collapsed && "lg:justify-center lg:px-3",
        )}
      >
        <Brand className={cn(collapsed && "lg:hidden")} />
        {collapsed && <Brand compact className="hidden lg:flex" />}
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label="Cerrar menú"
          onPress={onCloseMobile}
          className="ml-auto size-8 rounded-lg text-muted lg:hidden"
        >
          <X className="size-4" />
        </Button>
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          onPress={onToggleCollapsed}
          className={cn(
            "ml-auto hidden size-8 rounded-lg text-muted lg:flex",
            collapsed && "lg:hidden",
          )}
        >
          <ChevronsLeft className="size-4" />
        </Button>
      </div>

      <nav className="app-scrollbar flex-1 overflow-y-auto px-3 py-5">
        {navGroups.map((group, groupIndex) => (
          <div
            key={group.label}
            className={cn(groupIndex > 0 && "mt-6 border-t border-border/70 pt-5")}
          >
            <p
              className={cn(
                "mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/80",
                collapsed && "lg:hidden",
              )}
            >
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex h-10 items-center gap-3 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors duration-150",
                        isActive
                          ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(0,102,204,0.65)]"
                          : "text-muted hover:bg-default hover:text-foreground",
                        collapsed && "lg:justify-center lg:px-0",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0",
                            isActive
                              ? "text-white"
                              : "text-muted/90 transition-colors group-hover:text-foreground",
                          )}
                          strokeWidth={isActive ? 2.2 : 1.9}
                        />
                        <span
                          className={cn(
                            "truncate",
                            collapsed && "lg:hidden",
                          )}
                        >
                          {item.label}
                        </span>
                        {item.badge && badges[item.badge] !== undefined && (
                          <span
                            className={cn(
                              "ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                              isActive
                                ? "bg-white/15 text-white"
                                : "bg-default text-muted",
                              collapsed && "lg:hidden",
                            )}
                          >
                            {badges[item.badge]}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border/80 p-3">
        <div
          className={cn(
            "mb-3 overflow-hidden rounded-xl border border-border/80 bg-surface-secondary/60 p-3",
            collapsed && "lg:hidden",
          )}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span
                className={cn(
                  "absolute inline-flex size-full rounded-full opacity-60",
                  synced ? "bg-emerald-400" : "bg-amber-400",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex size-2 rounded-full",
                  synced ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
            </span>
            <p className="text-[11px] font-semibold">
              {synced
                ? "Conectado a la base de datos"
                : summary.error
                  ? "Sin conexión con la base"
                  : "Conectando..."}
            </p>
          </div>
          {summary.data && (
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              {plural(summary.data.projects.active, "proyecto activo", "proyectos activos")}{" "}
              · {plural(summary.data.documents.total, "documento")}
            </p>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-1.5 py-1.5",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          <Avatar size="sm" color="accent" variant="soft">
            <Avatar.Fallback className="text-[10px] font-semibold">
              {getInitials(user.name)}
            </Avatar.Fallback>
          </Avatar>
          <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <p className="truncate text-[11.5px] font-semibold">{user.name}</p>
            <p className="truncate text-[10px] text-muted">{user.email}</p>
          </div>
          <CircleHelp
            className={cn("size-4 text-muted", collapsed && "lg:hidden")}
          />
        </div>

        <div
          className={cn(
            "mt-2 flex items-center justify-between border-t border-border/60 px-1 pt-2",
            collapsed && "lg:hidden",
          )}
        >
          <span className="text-[9.5px] font-medium uppercase tracking-wider text-muted/70">
            Process Hub v1.0
          </span>
          <Sparkles className="size-3 text-brand/70" />
        </div>

        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label="Expandir menú"
          onPress={onToggleCollapsed}
          className={cn(
            "mt-1 hidden h-8 w-full rounded-lg text-muted lg:flex",
            !collapsed && "lg:hidden",
          )}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </aside>
  );
}
