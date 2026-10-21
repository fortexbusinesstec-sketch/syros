import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { CloudOff, LoaderCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center",
        className,
      )}
    >
      <Icon className="size-6 text-muted/60" />
      <p className="mt-3 text-[12px] font-semibold">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({
  label = "Cargando datos...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 px-6 py-14 text-[11px] text-muted",
        className,
      )}
    >
      <LoaderCircle className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: Error;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={CloudOff}
      title="No se pudieron cargar los datos"
      description={error.message}
      className={className}
      action={
        onRetry && (
          <Button
            variant="secondary"
            size="sm"
            onPress={onRetry}
            className="h-8 rounded-lg text-[11px]"
          >
            Reintentar
          </Button>
        )
      }
    />
  );
}
