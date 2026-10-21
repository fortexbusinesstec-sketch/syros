import { Card } from "@heroui/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "emerald" | "amber" | "violet";

const toneStyles: Record<Tone, { icon: string }> = {
  blue: {
    icon: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  },
};

interface KpiCardProps {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: Tone;
  trend?: {
    label: string;
    direction: "up" | "down" | "neutral";
  };
}

export function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  trend,
}: KpiCardProps) {
  const styles = toneStyles[tone];
  const TrendIcon =
    trend?.direction === "up"
      ? ArrowUpRight
      : trend?.direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <Card className="relative overflow-hidden border border-border/80 bg-surface shadow-none transition-colors duration-200 hover:border-border-secondary">
      <Card.Content className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "grid size-9 place-items-center rounded-xl",
              styles.icon,
            )}
          >
            <Icon className="size-[18px]" strokeWidth={2} />
          </span>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                trend.direction === "up" &&
                  "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
                trend.direction === "down" &&
                  "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
                trend.direction === "neutral" &&
                  "border-border bg-surface-secondary text-muted",
              )}
            >
              <TrendIcon className="size-3" />
              {trend.label}
            </span>
          )}
        </div>

        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          {label}
        </p>
        <p className="mt-1 text-[29px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
          {value}
        </p>
        <p className="mt-2 text-[10.5px] text-muted">{helper}</p>
      </Card.Content>
    </Card>
  );
}
