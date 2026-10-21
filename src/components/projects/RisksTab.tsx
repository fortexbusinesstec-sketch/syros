import { Card, Chip } from "@heroui/react";
import { ShieldAlert } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateMessage";
import { RecordFormModal, type FieldDef } from "@/components/records/RecordFormModal";
import { AddButton, SectionHeader, StatusChip } from "@/components/records/shared";
import { toFormValues, useRecordModal } from "@/components/records/helpers";
import { mutate, useApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  IMPACT_LEVELS,
  PRIORITIES,
  RISK_CATEGORIES,
  RISK_RESPONSES,
  RISK_STATUSES,
} from "@/types/domain";
import type { Project, Risk } from "@/types";

const FIELDS: FieldDef[] = [
  { name: "description", label: "Riesgo", kind: "textarea", required: true, rows: 2, placeholder: "Si ocurre [causa], entonces [efecto] sobre el proyecto." },
  { name: "category", label: "Categoría", kind: "select", options: RISK_CATEGORIES },
  { name: "owner", label: "Responsable", kind: "text" },
  { name: "probability", label: "Probabilidad", kind: "select", options: PRIORITIES, required: true },
  { name: "impact", label: "Impacto", kind: "select", options: IMPACT_LEVELS, required: true },
  { name: "response", label: "Respuesta", kind: "select", options: RISK_RESPONSES },
  { name: "status", label: "Estado", kind: "select", options: RISK_STATUSES, required: true },
  { name: "mitigation_plan", label: "Plan de acción", kind: "textarea", rows: 3 },
];

const NAMES = FIELDS.map((field) => field.name);
const SCORE: Record<string, number> = { Alta: 3, Alto: 3, Media: 2, Medio: 2, Baja: 1, Bajo: 1 };

function level(risk: Pick<Risk, "probability" | "impact">) {
  const score = (SCORE[risk.probability ?? ""] ?? 0) * (SCORE[risk.impact ?? ""] ?? 0);
  if (!score) return null;
  if (score >= 6) return { label: "Crítico", color: "danger" as const, cell: "bg-rose-500/80 text-white" };
  if (score >= 3) return { label: "Moderado", color: "warning" as const, cell: "bg-amber-400/80 text-amber-950" };
  return { label: "Bajo", color: "success" as const, cell: "bg-emerald-400/70 text-emerald-950" };
}

export function RisksTab({ project }: { project: Project }) {
  const { data, loading, error, reload } = useApi<Risk[]>(`/projects/${project.id}/risks`);
  const modal = useRecordModal<Risk>();

  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (loading && !data) return <LoadingState />;

  const risks = data ?? [];
  const open = risks.filter((risk) => risk.status !== "Cerrado");

  const save = async (values: Record<string, string | null>) => {
    if (modal.record) await mutate("PATCH", `/risks/${modal.record.id}`, values);
    else await mutate("POST", "/risks", { ...values, project_id: project.id });
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Riesgos"
        description="Matriz de riesgos con probabilidad, impacto y plan de respuesta."
        actions={
          <AddButton
            label="Agregar riesgo"
            onPress={() => modal.openNew({ probability: "Media", impact: "Medio", status: "Abierto", response: "Mitigar" })}
          />
        }
      />

      {!risks.length ? (
        <EmptyState icon={ShieldAlert} title="Aún no registras riesgos" description="Identifícalos en Planificación y dales seguimiento durante la ejecución." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Card className="border border-border/80 bg-surface shadow-none">
            <Card.Content className="divide-y divide-border/70 p-0">
              {risks.map((risk) => {
                const riskLevel = level(risk);
                return (
                  <button
                    type="button"
                    key={risk.id}
                    onClick={() => modal.openEdit(risk)}
                    className={cn(
                      "flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-surface-secondary/40",
                      risk.status === "Cerrado" && "opacity-60",
                    )}
                  >
                    <span className="flex flex-wrap items-start gap-2">
                      <span className="min-w-0 flex-1 text-[12px] font-medium leading-snug">{risk.description}</span>
                      {riskLevel && (
                        <Chip size="sm" variant="soft" color={riskLevel.color} className="shrink-0">
                          {riskLevel.label}
                        </Chip>
                      )}
                      <StatusChip value={risk.status} done={["Cerrado"]} warn={["En seguimiento"]} />
                    </span>
                    <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted">
                      {risk.category && <span>{risk.category}</span>}
                      <span>Probabilidad {risk.probability?.toLowerCase() ?? "—"}</span>
                      <span>Impacto {risk.impact?.toLowerCase() ?? "—"}</span>
                      {risk.response && <span>Respuesta: {risk.response}</span>}
                      {risk.owner && <span>Responsable: {risk.owner}</span>}
                    </span>
                    {risk.mitigation_plan && (
                      <span className="line-clamp-2 whitespace-pre-line text-[10.5px] leading-relaxed text-muted/90">
                        {risk.mitigation_plan}
                      </span>
                    )}
                  </button>
                );
              })}
            </Card.Content>
          </Card>

          <Card className="h-fit border border-border/80 bg-surface shadow-none">
            <Card.Content className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Mapa de calor · {open.length} abiertos
              </p>
              <div className="mt-3 grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1 text-[9.5px]">
                <span />
                {[...IMPACT_LEVELS].reverse().map((impact) => (
                  <span key={impact} className="text-center text-muted">
                    Impacto {impact.toLowerCase()}
                  </span>
                ))}
                {PRIORITIES.map((probability) => (
                  <div key={probability} className="contents">
                    <span className="flex items-center pr-1 text-muted">{probability}</span>
                    {[...IMPACT_LEVELS].reverse().map((impact) => {
                      const count = open.filter((risk) => risk.probability === probability && risk.impact === impact).length;
                      const cellLevel = level({ probability, impact });
                      return (
                        <span
                          key={impact}
                          className={cn(
                            "grid h-11 place-items-center rounded-lg text-[13px] font-semibold tabular-nums",
                            count ? cellLevel?.cell : "bg-surface-secondary/60 text-muted/50",
                          )}
                        >
                          {count || "·"}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[9.5px] text-muted">Filas: probabilidad. Solo cuenta riesgos no cerrados.</p>
            </Card.Content>
          </Card>
        </div>
      )}

      <RecordFormModal
        key={modal.key}
        isOpen={modal.open}
        onOpenChange={modal.setOpen}
        icon={ShieldAlert}
        title={modal.record ? "Editar riesgo" : "Nuevo riesgo"}
        subtitle={project.name}
        fields={FIELDS}
        initialValues={modal.record ? toFormValues(modal.record, NAMES) : modal.preset}
        submitLabel={modal.record ? "Guardar cambios" : "Agregar"}
        onSubmit={save}
        onDelete={modal.record ? () => mutate("DELETE", `/risks/${modal.record!.id}`).then(() => undefined) : undefined}
      />
    </div>
  );
}
