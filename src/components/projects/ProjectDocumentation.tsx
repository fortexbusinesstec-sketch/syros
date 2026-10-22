import { useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import { ArrowUpRight, FilePlus2, LayoutTemplate } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateMessage";
import { ApiError, mutate, useApi } from "@/lib/api";
import { DOCUMENT_STATUS_COLOR, PHASE_META, PROJECT_PHASES, templateIcon } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { Project, ProjectDocument, Template } from "@/types";

export function ProjectDocumentation({ project }: { project: Project }) {
  const navigate = useNavigate();
  const templatesQuery = useApi<Template[]>("/templates");
  const documentsQuery = useApi<ProjectDocument[]>(`/projects/${project.id}/documents`);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadError = templatesQuery.error ?? documentsQuery.error;
  if (loadError && (!templatesQuery.data || !documentsQuery.data)) {
    return (
      <ErrorState
        error={loadError}
        onRetry={() => {
          void templatesQuery.reload();
          void documentsQuery.reload();
        }}
      />
    );
  }
  if (!templatesQuery.data || !documentsQuery.data) return <LoadingState />;

  const templates = templatesQuery.data;
  const documentsByTemplate = new Map(documentsQuery.data.map((document) => [document.template_id, document]));
  const currentStep = PHASE_META[project.current_phase]?.step ?? 1;

  if (!templates.length) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title="Aún no defines plantillas"
        description="Las plantillas indican qué documentos lleva cada fase. Créalas una vez y úsalas en todos tus proyectos."
        action={
          <Button
            variant="primary"
            size="sm"
            onPress={() => navigate("/templates")}
            className="h-8 gap-1.5 rounded-lg text-[11px]"
          >
            <LayoutTemplate className="size-3.5" />
            Ir a Plantillas
          </Button>
        }
      />
    );
  }

  const create = async (templateIds: string[], key: string, open: boolean) => {
    setBusy(key);
    setError("");
    try {
      let lastId = "";
      for (const templateId of templateIds) {
        const { id } = await mutate<{ id: string }>("POST", "/documents", {
          project_id: project.id,
          template_id: templateId,
        });
        lastId = id;
      }
      if (open && lastId) navigate(`/projects/${project.id}/docs/${lastId}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo crear el documento.");
    } finally {
      setBusy(null);
    }
  };

  const created = templates.filter((template) => documentsByTemplate.has(template.id)).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.015em]">Documentación por fase</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {created} de {templates.length} documentos creados a partir de tus plantillas.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => navigate("/templates")}
          className="h-8 gap-1.5 self-start rounded-lg px-2 text-[10.5px] text-muted sm:self-auto"
        >
          <LayoutTemplate className="size-3.5" />
          Gestionar plantillas
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-[11px] text-danger">
          {error}
        </p>
      )}

      {PROJECT_PHASES.map((phase) => {
        const items = templates.filter((template) => template.phase === phase);
        if (!items.length) return null;
        const meta = PHASE_META[phase];
        const missing = items.filter((template) => !documentsByTemplate.has(template.id));
        const isCurrent = meta.step === currentStep;

        return (
          <section key={phase}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-md text-[10px] font-semibold",
                    meta.soft,
                    meta.text,
                  )}
                >
                  {meta.step}
                </span>
                <h3 className="text-[12.5px] font-semibold">{phase}</h3>
                {isCurrent && (
                  <Chip size="sm" variant="soft" color="accent">
                    Fase actual
                  </Chip>
                )}
                <span className="text-[10px] text-muted">
                  {items.length - missing.length}/{items.length}
                </span>
              </div>
              {missing.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  isPending={busy === phase}
                  onPress={() => void create(missing.map((template) => template.id), phase, false)}
                  className="h-7 gap-1 rounded-md px-2 text-[10.5px] text-brand"
                >
                  <FilePlus2 className="size-3.5" />
                  Crear los {missing.length} pendientes
                </Button>
              )}
            </div>

            <Card className="border border-border/80 bg-surface shadow-none">
              <Card.Content className="divide-y divide-border/70 p-0">
                {items.map((template) => {
                  const document = documentsByTemplate.get(template.id);
                  const Icon = templateIcon(template.format);
                  return (
                    <div key={template.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-lg",
                          document ? cn(meta.soft, meta.text) : "bg-surface-secondary text-muted/70",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-[12px] font-medium", !document && "text-muted")}>
                          {template.name}
                        </p>
                        <p className="truncate text-[10px] text-muted">
                          {document
                            ? `Editado el ${formatDate(document.updated_at)}`
                            : (template.description ?? template.format)}
                        </p>
                      </div>
                      {document ? (
                        <>
                          <Chip
                            size="sm"
                            variant="soft"
                            color={DOCUMENT_STATUS_COLOR[document.status] ?? "default"}
                            className="hidden shrink-0 sm:inline-flex"
                          >
                            {document.status}
                          </Chip>
                          <Button
                            size="sm"
                            variant="secondary"
                            onPress={() => navigate(`/projects/${project.id}/docs/${document.id}`)}
                            className="h-8 shrink-0 gap-1 rounded-lg text-[10.5px]"
                          >
                            Abrir
                            <ArrowUpRight className="size-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          isPending={busy === template.id}
                          isDisabled={busy !== null && busy !== template.id}
                          onPress={() => void create([template.id], template.id, true)}
                          className="h-8 shrink-0 gap-1 rounded-lg text-[10.5px] text-brand"
                        >
                          <FilePlus2 className="size-3.5" />
                          Crear
                        </Button>
                      )}
                    </div>
                  );
                })}
              </Card.Content>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
