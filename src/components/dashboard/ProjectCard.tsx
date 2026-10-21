import { Button, Card, Chip } from "@heroui/react";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PHASE_META, STATUS_META } from "@/lib/constants";
import {
  cn,
  formatDate,
  getInitials,
  initialsColor,
} from "@/lib/utils";
import type { Project } from "@/types";

export function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const phase = PHASE_META[project.current_phase] ?? PHASE_META.Iniciación;
  const status = STATUS_META[project.status] ?? STATUS_META.Activo;

  return (
    <Card
      className={cn(
        "group relative h-full overflow-hidden border border-border/80 bg-surface shadow-none transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_16px_32px_-20px_rgba(15,23,42,0.28)]",
      )}
    >
      <Button
        variant="ghost"
        aria-label={`Abrir proyecto ${project.name}`}
        onPress={() => navigate(`/projects/${project.id}`)}
        className="absolute inset-0 z-10 h-full w-full rounded-xl bg-transparent p-0 data-[hovered]:bg-transparent data-[pressed]:bg-transparent"
      />

      <Card.Content className="pointer-events-none flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold",
              phase.soft,
              phase.text,
            )}
          >
            <span className={cn("size-1.5 rounded-full", phase.dot)} />
            {project.current_phase}
          </span>
          <Chip size="sm" variant="soft" color={status.color}>
            <span className={cn("size-1.5 rounded-full", status.dot)} />
            <Chip.Label>{project.status}</Chip.Label>
          </Chip>
        </div>

        <div className="mt-4">
          <h3 className="line-clamp-2 text-[14.5px] font-semibold leading-snug tracking-[-0.015em] transition-colors group-hover:text-brand">
            {project.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 min-h-[34px] text-[11.5px] leading-relaxed text-muted">
            {project.description ?? "Sin descripción"}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-border/80 bg-surface-secondary/60 px-1.5 py-0.5 text-[9.5px] font-medium text-muted"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 border-t border-border/70 pt-3.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1.5 text-muted">
              <CalendarDays className="size-3" />
              {formatDate(project.start_date)}
            </span>
            <span
              title={`${project.task_total} tareas de sprint`}
              className="font-semibold tabular-nums text-foreground"
            >
              {project.progress}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
            <div
              className={cn("h-full rounded-full transition-all", phase.accent)}
              style={{ width: `${project.progress}%` }}
            />
          </div>

          <div className="mt-3.5 flex items-center justify-between">
            <div className="flex -space-x-1.5">
              {project.team.slice(0, 3).map((member) => (
                <span
                  key={member}
                  title={member}
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-[8.5px] font-semibold ring-2 ring-surface",
                    initialsColor(member),
                  )}
                >
                  {getInitials(member)}
                </span>
              ))}
              {project.team.length > 3 && (
                <span className="grid size-6 place-items-center rounded-full bg-default text-[8.5px] font-semibold text-muted ring-2 ring-surface">
                  +{project.team.length - 3}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted transition-colors group-hover:text-brand">
              Ver detalle
              <ArrowUpRight className="size-3" />
            </span>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
