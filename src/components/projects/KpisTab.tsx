import { Card } from "@heroui/react";
import { Gauge } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateMessage";
import { RecordFormModal, type FieldDef } from "@/components/records/RecordFormModal";
import { AddButton, SectionHeader, StatusChip } from "@/components/records/shared";
import { toFormValues, useRecordModal } from "@/components/records/helpers";
import { mutate, useApi } from "@/lib/api";
import { KPI_FREQUENCIES, KPI_STATUSES } from "@/types/domain";
import type { Kpi, Project, Stakeholder } from "@/types";

const NAMES = [
  "stakeholder_id",
  "name",
  "description",
  "metric",
  "unit",
  "frequency",
  "baseline_value",
  "target_value",
  "actual_value",
  "status",
];

function fieldsFor(stakeholders: Stakeholder[]): FieldDef[] {
  return [
    {
      name: "stakeholder_id",
      label: "Stakeholder",
      kind: "select",
      options: stakeholders.map((stakeholder) => ({ value: stakeholder.id, label: stakeholder.name })),
      placeholder: "Sin asignar",
      description: stakeholders.length ? undefined : "Registra stakeholders en su pestaña para poder asignarlos.",
    },
    { name: "name", label: "KPI", kind: "text", required: true, placeholder: "Ej. Tiempo de aprobación de vacaciones" },
    { name: "description", label: "Descripción", kind: "textarea", rows: 2 },
    { name: "metric", label: "Fórmula / cómo se mide", kind: "text", wide: true },
    { name: "unit", label: "Unidad", kind: "text", placeholder: "Ej. días, %, S/" },
    { name: "frequency", label: "Frecuencia", kind: "select", options: KPI_FREQUENCIES },
    { name: "baseline_value", label: "Línea base", kind: "text" },
    { name: "target_value", label: "Meta", kind: "text" },
    { name: "actual_value", label: "Valor actual", kind: "text" },
    { name: "status", label: "Estado", kind: "select", options: KPI_STATUSES, required: true },
  ];
}

export function KpisTab({ project }: { project: Project }) {
  const kpisQuery = useApi<Kpi[]>(`/projects/${project.id}/kpis`);
  const stakeholdersQuery = useApi<Stakeholder[]>(`/projects/${project.id}/stakeholders`);
  const modal = useRecordModal<Kpi>();

  const error = kpisQuery.error ?? stakeholdersQuery.error;
  if (error && (!kpisQuery.data || !stakeholdersQuery.data)) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void kpisQuery.reload();
          void stakeholdersQuery.reload();
        }}
      />
    );
  }
  if (!kpisQuery.data || !stakeholdersQuery.data) return <LoadingState />;

  const kpis = kpisQuery.data;
  const fields = fieldsFor(stakeholdersQuery.data);
  const groups = new Map<string, Kpi[]>();
  for (const kpi of kpis) {
    const key = kpi.stakeholder_name ?? "Sin stakeholder asignado";
    groups.set(key, [...(groups.get(key) ?? []), kpi]);
  }

  const save = async (values: Record<string, string | null>) => {
    if (modal.record) await mutate("PATCH", `/kpis/${modal.record.id}`, values);
    else await mutate("POST", "/kpis", { ...values, project_id: project.id });
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="KPIs por stakeholder"
        description="Indicadores con los que cada stakeholder medirá el éxito del proyecto."
        actions={<AddButton label="Agregar KPI" onPress={() => modal.openNew({ status: "Sin medir" })} />}
      />

      {!kpis.length ? (
        <EmptyState
          icon={Gauge}
          title="Aún no defines KPIs"
          description={
            stakeholdersQuery.data.length
              ? "Agrega los indicadores que le importan a cada stakeholder."
              : "Primero registra a los stakeholders; luego asígnales sus KPIs."
          }
        />
      ) : (
        [...groups.entries()].map(([stakeholder, items]) => (
          <section key={stakeholder}>
            <h3 className="mb-2 text-[12px] font-semibold">
              {stakeholder} <span className="font-normal text-muted">· {items.length}</span>
            </h3>
            <Card className="border border-border/80 bg-surface shadow-none">
              <Card.Content className="app-scrollbar overflow-x-auto p-0">
                <table className="w-full min-w-[720px] text-left text-[11px]">
                  <thead className="border-b border-border/70 text-[9.5px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-2 font-semibold">KPI</th>
                      <th className="px-3 py-2 font-semibold">Fórmula</th>
                      <th className="px-3 py-2 font-semibold">Frecuencia</th>
                      <th className="px-3 py-2 text-right font-semibold">Línea base</th>
                      <th className="px-3 py-2 text-right font-semibold">Meta</th>
                      <th className="px-3 py-2 text-right font-semibold">Actual</th>
                      <th className="px-4 py-2 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {items.map((kpi) => {
                      const withUnit = (value: string | null) =>
                        value ? `${value}${kpi.unit ? ` ${kpi.unit}` : ""}` : "—";
                      return (
                        <tr
                          key={kpi.id}
                          onClick={() => modal.openEdit(kpi)}
                          className="cursor-pointer transition-colors hover:bg-surface-secondary/40"
                        >
                          <td className="px-4 py-2.5">
                            <p className="font-medium">{kpi.name}</p>
                            {kpi.description && <p className="mt-0.5 line-clamp-1 text-[10px] text-muted">{kpi.description}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-muted">{kpi.metric ?? "—"}</td>
                          <td className="px-3 py-2.5 text-muted">{kpi.frequency ?? "—"}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{withUnit(kpi.baseline_value)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{withUnit(kpi.target_value)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{withUnit(kpi.actual_value)}</td>
                          <td className="px-4 py-2.5">
                            <StatusChip value={kpi.status} done={["En meta"]} warn={["En riesgo", "Fuera de meta"]} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card.Content>
            </Card>
          </section>
        ))
      )}

      <RecordFormModal
        key={modal.key}
        isOpen={modal.open}
        onOpenChange={modal.setOpen}
        icon={Gauge}
        title={modal.record ? "Editar KPI" : "Nuevo KPI"}
        subtitle={project.name}
        fields={fields}
        initialValues={modal.record ? toFormValues(modal.record, NAMES) : modal.preset}
        submitLabel={modal.record ? "Guardar cambios" : "Agregar"}
        onSubmit={save}
        onDelete={modal.record ? () => mutate("DELETE", `/kpis/${modal.record!.id}`).then(() => undefined) : undefined}
      />
    </div>
  );
}
