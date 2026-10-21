import { Card } from "@heroui/react";
import { Mail, Users } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateMessage";
import { RecordFormModal, type FieldDef } from "@/components/records/RecordFormModal";
import { AddButton, LevelChip, SectionHeader } from "@/components/records/shared";
import { toFormValues, useRecordModal } from "@/components/records/helpers";
import { mutate, useApi } from "@/lib/api";
import { cn, getInitials, initialsColor } from "@/lib/utils";
import { INFLUENCE_LEVELS, INTEREST_LEVELS } from "@/types/domain";
import type { Project, Stakeholder } from "@/types";

const FIELDS: FieldDef[] = [
  { name: "name", label: "Nombre", kind: "text", required: true, placeholder: "Ej. Gerente de Finanzas" },
  { name: "influence", label: "Influencia", kind: "select", options: INFLUENCE_LEVELS, required: true },
  { name: "interest", label: "Interés", kind: "select", options: INTEREST_LEVELS, required: true },
  { name: "notes", label: "Notas", kind: "textarea", rows: 4, placeholder: "Expectativas, preocupaciones, cómo involucrarlo..." },
  { name: "role", label: "Rol", kind: "text", placeholder: "Opcional" },
  { name: "company_area", label: "Área", kind: "text", placeholder: "Opcional" },
  { name: "email", label: "Correo", kind: "email", placeholder: "Opcional" },
  { name: "phone", label: "Teléfono", kind: "text", placeholder: "Opcional" },
];

const NAMES = FIELDS.map((field) => field.name);

/** Estrategia clásica de la matriz poder / interés. */
function strategy(influence: string, interest: string) {
  const high = (value: string) => value === "Alta" || value === "Alto";
  if (high(influence) && high(interest)) return "Gestionar de cerca";
  if (high(influence)) return "Mantener satisfecho";
  if (high(interest)) return "Mantener informado";
  return "Monitorear";
}

export function StakeholdersTab({ project }: { project: Project }) {
  const path = `/projects/${project.id}/stakeholders`;
  const { data, loading, error, reload } = useApi<Stakeholder[]>(path);
  const modal = useRecordModal<Stakeholder>();
  const stakeholders = data ?? [];

  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (loading && !data) return <LoadingState />;

  const save = async (values: Record<string, string | null>) => {
    if (modal.record) await mutate("PATCH", `/stakeholders/${modal.record.id}`, values);
    else await mutate("POST", "/stakeholders", { ...values, project_id: project.id });
  };

  const openNew = () => modal.openNew({ influence: "Media", interest: "Medio" });

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Stakeholders"
        description="Personas y áreas que influyen o se ven afectadas por el proyecto."
        actions={<AddButton label="Agregar stakeholder" onPress={openNew} />}
      />

      {!stakeholders.length ? (
        <EmptyState
          icon={Users}
          title="Aún no registras stakeholders"
          description="Regístralos en Descubrimiento con su influencia e interés; luego podrás asignarles KPIs."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="border border-border/80 bg-surface shadow-none">
            <Card.Content className="divide-y divide-border/70 p-0">
              {stakeholders.map((stakeholder) => (
                <button
                  type="button"
                  key={stakeholder.id}
                  onClick={() => modal.openEdit(stakeholder)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-secondary/40"
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold",
                      initialsColor(stakeholder.name),
                    )}
                  >
                    {getInitials(stakeholder.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold">{stakeholder.name}</span>
                    {(stakeholder.role || stakeholder.company_area) && (
                      <span className="block truncate text-[10.5px] text-muted">
                        {[stakeholder.role, stakeholder.company_area].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {stakeholder.notes && (
                      <span className="mt-1 line-clamp-2 block text-[10.5px] leading-relaxed text-muted/90">
                        {stakeholder.notes}
                      </span>
                    )}
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <LevelChip label="Influencia" value={stakeholder.influence} />
                      <LevelChip label="Interés" value={stakeholder.interest} />
                      <span className="text-[9.5px] text-muted">
                        {strategy(stakeholder.influence, stakeholder.interest)}
                      </span>
                    </span>
                  </span>
                  {stakeholder.email && (
                    <a
                      href={`mailto:${stakeholder.email}`}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Escribir a ${stakeholder.name}`}
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-default hover:text-foreground"
                    >
                      <Mail className="size-3.5" />
                    </a>
                  )}
                </button>
              ))}
            </Card.Content>
          </Card>

          <Card className="h-fit border border-border/80 bg-surface shadow-none">
            <Card.Content className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Matriz influencia / interés
              </p>
              <div className="mt-3 grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1 text-[9.5px]">
                <span />
                {[...INTEREST_LEVELS].reverse().map((interest) => (
                  <span key={interest} className="pb-0.5 text-center text-muted">
                    Interés {interest.toLowerCase()}
                  </span>
                ))}
                {INFLUENCE_LEVELS.map((influence) => (
                  <div key={influence} className="contents">
                    <span className="flex items-center pr-1 text-muted [writing-mode:vertical-rl] rotate-180">
                      {influence}
                    </span>
                    {[...INTEREST_LEVELS].reverse().map((interest) => {
                      const cell = stakeholders.filter(
                        (item) => item.influence === influence && item.interest === interest,
                      );
                      const hot = influence === "Alta" && interest === "Alto";
                      return (
                        <div
                          key={interest}
                          className={cn(
                            "min-h-14 rounded-lg border p-1.5",
                            hot
                              ? "border-brand/30 bg-brand-soft/50 dark:bg-brand/10"
                              : "border-border/70 bg-surface-secondary/40",
                          )}
                        >
                          {cell.map((item) => (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => modal.openEdit(item)}
                              title={item.name}
                              className="mb-0.5 block w-full truncate rounded bg-surface px-1 py-0.5 text-left text-[9.5px] font-medium shadow-[0_1px_1px_rgba(15,23,42,0.05)] hover:text-brand"
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[9.5px] text-muted">
                Filas: influencia. El cuadro resaltado es «gestionar de cerca».
              </p>
            </Card.Content>
          </Card>
        </div>
      )}

      <RecordFormModal
        key={modal.key}
        isOpen={modal.open}
        onOpenChange={modal.setOpen}
        icon={Users}
        title={modal.record ? "Editar stakeholder" : "Nuevo stakeholder"}
        subtitle={project.name}
        fields={FIELDS}
        initialValues={modal.record ? toFormValues(modal.record, NAMES) : modal.preset}
        submitLabel={modal.record ? "Guardar cambios" : "Agregar"}
        onSubmit={save}
        onDelete={
          modal.record
            ? () => mutate("DELETE", `/stakeholders/${modal.record!.id}`).then(() => undefined)
            : undefined
        }
      />
    </div>
  );
}
