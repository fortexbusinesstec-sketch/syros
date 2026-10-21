import { Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandProps {
  compact?: boolean;
  className?: string;
}

export function Brand({ compact = false, className }: BrandProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className="brand-gradient relative grid size-9 shrink-0 place-items-center rounded-xl shadow-[0_6px_16px_-6px_rgba(0,102,204,0.75)]">
        <Workflow className="size-[19px] text-white" strokeWidth={2.2} />
        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-surface" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight tracking-[-0.02em]">
            Process Hub
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
            Automation Team
          </p>
        </div>
      )}
    </div>
  );
}
