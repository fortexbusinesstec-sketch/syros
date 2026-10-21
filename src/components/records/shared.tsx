import type { ReactNode } from "react";
import { Button, Chip } from "@heroui/react";
import { Plus } from "lucide-react";
import { levelColor, type ChipColor } from "@/components/records/helpers";

export function LevelChip({ label, value }: { label?: string; value: string | null | undefined }) {
  if (!value) return <span className="text-[10px] text-muted/70">—</span>;
  return (
    <Chip size="sm" variant="soft" color={levelColor(value)} className="shrink-0">
      {label ? `${label} ${value.toLowerCase()}` : value}
    </Chip>
  );
}

export function StatusChip({ value, done, warn }: { value: string; done?: string[]; warn?: string[] }) {
  const color: ChipColor = done?.includes(value) ? "success" : warn?.includes(value) ? "warning" : "default";
  return (
    <Chip size="sm" variant="soft" color={color} className="shrink-0">
      {value}
    </Chip>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[14px] font-semibold tracking-[-0.015em]">{title}</h2>
        <p className="mt-0.5 text-[11px] text-muted">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button variant="primary" size="sm" onPress={onPress} className="h-8 gap-1.5 rounded-lg text-[11px]">
      <Plus className="size-3.5" />
      {label}
    </Button>
  );
}
