import { useState } from "react";
import { Button, Card } from "@heroui/react";
import { BookMarked, ListTree, Plus, Waypoints } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateMessage";
import { RecordFormModal, type FieldDef } from "@/components/records/RecordFormModal";
import { LevelChip, SectionHeader, StatusChip } from "@/components/records/shared";
import { nextCode, toFormValues, useRecordModal } from "@/components/records/helpers";
import { mutate, useApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PRIORITIES, REQUIREMENT_STATUSES } from "@/types/domain";
import type { Project, Requirement, RequirementType } from "@/types";

const PREFIX: Record<RequirementType, string> = {
  Épica: "EP",
  "Historia de Usuario": "HU",
  "Caso de Uso": "CU",
};

const COMMON: FieldDef[] = [
  { name: "priority", label: "Prioridad", kind: "select", options: PRIORITIES, required: true },
  { name: "status", label: "Estado", kind: "select", options: REQUIREMENT_STATUSES, required: true },
];

function fieldsFor(type: RequirementType, epics: Requirement[]): FieldDef[] {
  if (type === "Épica") {
    return [
      { name: "code", label: "Código", kind: "text", placeholder: "EP-01" },
      { name: "title", label: "Épica", kind: "text", required: true, placeholder: "Ej. Conciliación automática" },
      { name: "description", label: "Descripción", kind: "textarea", rows: 4 },
      ...COMMON,
    ];
  }
  if (type === "Historia de Usuario") {
    return [
      {
        name: "parent_id",
        label: "Épica",
        kind: "select",
        options: epics.map((epic) => ({
          value: epic.id,
          label: epic.code ? `${epic.code} · ${epic.title}` : epic.title,
        })),
        placeholder: "Sin épica",
      },
      { name: "code", label: "Código", kind: "text", placeholder: "HU-01" },
      {
        name: "title",
        label: "Historia",
        kind: "textarea",
        required: true,
        rows: 2,
        placeholder: "Como [rol], quiero [acción] para [beneficio].",
      },
      {
        name: "acceptance_criteria",
        label: "Criterios de aceptación",
        kind: "textarea",
        rows: 5,
        placeholder: "Dado [contexto], cuando [acción], entonces [resultado].\nUno por línea.",
      },
      { name: "description", label: "Notas", kind: "textarea", rows: 2 },
      ...COMMON,
    ];
  }
  return [
    { name: "code", label: "Código", kind: "text", placeholder: "CU-01" },
    { name: "title", label: "Caso de uso", kind: "text", required: true, placeholder: "Ej. Registrar solicitud de vacaciones" },
    {
      name: "description",
      label: "Actores, precondiciones y flujo principal",
      kind: "textarea",
      rows: 7,
      placeholder: "Actor principal: ...\nPrecondiciones: ...\n\nFlujo principal:\n1. ...\n2. ...",
    },
    {
      name: "acceptance_criteria",
      label: "Flujos alternativos, excepciones y postcondiciones",
      kind: "textarea",
      rows: 4,
    },
    ...COMMON,
  ];
}

const DONE = ["Hecho"];
const WARN = ["En análisis", "En desarrollo"];

function RequirementRow({
  item,
  onOpen,
  nested,
}: {
  item: Requirement;
  onOpen: (item: Requirement) => void;
  nested?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-surface-secondary/40",
        nested && "pl-10",
      )}
    >
      <span className="flex flex-wrap items-center gap-2">
        {item.code && (
          <span className="rounded border border-border/80 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-muted">
            {item.code}
          </span>
        )}
        <span className="min-w-0 flex-1 text-[12px] font-medium leading-snug">{item.title}</span>
        <LevelChip value={item.priority} />
        <StatusChip value={item.status} done={DONE} warn={WARN} />
      </span>
      {item.description && item.type !== "Historia de Usuario" && (
        <span className="line-clamp-3 whitespace-pre-line text-[10.5px] leading-relaxed text-muted">
          {item.description}
        </span>
      )}
      {item.acceptance_criteria && item.type === "Historia de Usuario" && (
        <span className="whitespace-pre-line rounded-md bg-surface-secondary/50 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-muted">
          <span className="font-semibold text-foreground/80">Criterios de aceptación: </span>
          {item.acceptance_criteria}
        </span>
      )}
    </button>
  );
}

export function RequirementsTab({ project }: { project: Project }) {
  const { data, loading, error, reload } = useApi<Requirement[]>(`/projects/${project.id}/requirements`);
  const modal = useRecordModal<Requirement>();
  const [view, setView] = useState<"historias" | "casos">("historias");
  const [newType, setNewType] = useState<RequirementType>("Épica");

  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (loading && !data) return <LoadingState />;

  const items = data ?? [];
  const epics = items.filter((item) => item.type === "Épica");
  const stories = items.filter((item) => item.type === "Historia de Usuario");
  const useCases = items.filter((item) => item.type === "Caso de Uso");
  const orphanStories = stories.filter((story) => !epics.some((epic) => epic.id === story.parent_id));

  const type = modal.record?.type ?? newType;
  const fields = fieldsFor(type, epics.filter((epic) => epic.id !== modal.record?.id));

  const openNew = (kind: RequirementType, parentId?: string) => {
    setNewType(kind);
    modal.openNew({
      code: nextCode(PREFIX[kind], items.filter((item) => item.type === kind).map((item) => item.code)),
      priority: "Media",
      status: "Backlog",
      ...(parentId ? { parent_id: parentId } : {}),
    });
  };

  const save = async (values: Record<string, string | null>) => {
    if (modal.record) await mutate("PATCH", `/requirements/${modal.record.id}`, values);
    else await mutate("POST", "/requirements", { ...values, type, project_id: project.id });
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Requerimientos"
        description="Épicas, historias de usuario con sus criterios de aceptación y casos de uso."
        actions={
          <>
            <Button variant="secondary" size="sm" onPress={() => openNew("Épica")} className="h-8 gap-1.5 rounded-lg text-[11px]">
              <Plus className="size-3.5" />
              Épica
            </Button>
            <Button variant="secondary" size="sm" onPress={() => openNew("Historia de Usuario")} className="h-8 gap-1.5 rounded-lg text-[11px]">
              <Plus className="size-3.5" />
              Historia de usuario
            </Button>
            <Button variant="secondary" size="sm" onPress={() => openNew("Caso de Uso")} className="h-8 gap-1.5 rounded-lg text-[11px]">
              <Plus className="size-3.5" />
              Caso de uso
            </Button>
          </>
        }
      />

      <div className="flex w-fit items-center gap-1 rounded-lg border border-border/80 bg-surface p-1">
        {(
          [
            ["historias", `Épicas e historias (${epics.length + stories.length})`],
            ["casos", `Casos de uso (${useCases.length})`],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={view === key ? "primary" : "ghost"}
            onPress={() => setView(key)}
            className={cn("h-7 rounded-md px-2.5 text-[10.5px]", view !== key && "text-muted")}
          >
            {label}
          </Button>
        ))}
      </div>

      {view === "historias" ? (
        epics.length || stories.length ? (
          <div className="space-y-3">
            {epics.map((epic) => {
              const children = stories.filter((story) => story.parent_id === epic.id);
              return (
                <Card key={epic.id} className="border border-border/80 bg-surface shadow-none">
                  <Card.Content className="divide-y divide-border/70 p-0">
                    <div className="flex items-start">
                      <span className="mt-3.5 pl-4 text-brand">
                        <ListTree className="size-4" />
                      </span>
                      <div className="flex-1">
                        <RequirementRow item={epic} onOpen={modal.openEdit} />
                      </div>
                    </div>
                    {children.map((story) => (
                      <RequirementRow key={story.id} item={story} onOpen={modal.openEdit} nested />
                    ))}
                    <div className="px-4 py-2 pl-10">
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => openNew("Historia de Usuario", epic.id)}
                        className="h-7 gap-1 rounded-md px-2 text-[10.5px] text-brand"
                      >
                        <Plus className="size-3.5" />
                        Historia en esta épica
                      </Button>
                    </div>
                  </Card.Content>
                </Card>
              );
            })}
            {orphanStories.length > 0 && (
              <Card className="border border-dashed border-border bg-surface shadow-none">
                <Card.Content className="divide-y divide-border/70 p-0">
                  <p className="px-4 py-2.5 text-[10.5px] font-semibold text-muted">Historias sin épica</p>
                  {orphanStories.map((story) => (
                    <RequirementRow key={story.id} item={story} onOpen={modal.openEdit} />
                  ))}
                </Card.Content>
              </Card>
            )}
          </div>
        ) : (
          <EmptyState
            icon={BookMarked}
            title="Aún no hay épicas ni historias de usuario"
            description="Crea una épica y agrégale historias con sus criterios de aceptación."
          />
        )
      ) : useCases.length ? (
        <Card className="border border-border/80 bg-surface shadow-none">
          <Card.Content className="divide-y divide-border/70 p-0">
            {useCases.map((useCase) => (
              <RequirementRow key={useCase.id} item={useCase} onOpen={modal.openEdit} />
            ))}
          </Card.Content>
        </Card>
      ) : (
        <EmptyState icon={Waypoints} title="Aún no hay casos de uso" />
      )}

      <RecordFormModal
        key={modal.key}
        isOpen={modal.open}
        onOpenChange={modal.setOpen}
        icon={type === "Caso de Uso" ? Waypoints : type === "Épica" ? ListTree : BookMarked}
        title={
          type === "Caso de Uso"
            ? `${modal.record ? "Editar" : "Nuevo"} caso de uso`
            : `${modal.record ? "Editar" : "Nueva"} ${type.toLowerCase()}`
        }
        subtitle={project.name}
        fields={fields}
        initialValues={modal.record ? toFormValues(modal.record, fields.map((field) => field.name)) : modal.preset}
        submitLabel={modal.record ? "Guardar cambios" : "Agregar"}
        onSubmit={save}
        onDelete={
          modal.record
            ? () => mutate("DELETE", `/requirements/${modal.record!.id}`).then(() => undefined)
            : undefined
        }
      />
    </div>
  );
}
