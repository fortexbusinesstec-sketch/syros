import { useState } from "react";
import { Button, Card } from "@heroui/react";
import {
  ArrowUpRight,
  LayoutTemplate,
  Plus,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/StateMessage";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewTemplateModal } from "@/components/templates/NewTemplateModal";
import { ApiError, mutate, useApi } from "@/lib/api";
import { PHASE_META, PROJECT_PHASES, templateIcon } from "@/lib/constants";
import { cn, formatDate, plural } from "@/lib/utils";
import type { ProjectPhase, Template } from "@/types";

export function TemplatesPage() {
  const { data, loading, error, reload } = useApi<Template[]>("/templates");
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ open: boolean; phase: ProjectPhase }>({
    open: false,
    phase: "Iniciación",
  });
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState("");

  const templates = data ?? [];
  const openModal = (phase: ProjectPhase = "Iniciación") => setModal({ open: true, phase });

  const seed = async () => {
    setSeeding(true);
    setMessage("");
    try {
      const { created } = await mutate<{ created: number }>("POST", "/templates/seed");
      setMessage(
        created
          ? `Se agregaron ${plural(created, "plantilla base", "plantillas base")}.`
          : "Ya tienes todas las plantillas base.",
      );
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "No se pudieron cargar las plantillas base.");
    } finally {
      setSeeding(false);
    }
  };

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        isPending={seeding}
        onPress={() => void seed()}
        className="h-10 gap-2 rounded-lg px-3.5 text-[12px]"
      >
        <Sparkles className="size-4" />
        Cargar plantillas base
      </Button>
      <Button
        variant="primary"
        onPress={() => openModal()}
        className="h-10 gap-2 rounded-lg px-4 text-[12.5px] font-semibold shadow-[0_8px_20px_-10px_rgba(0,102,204,0.8)]"
      >
        <Plus className="size-4" />
        Nueva plantilla
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentación"
        title="Plantillas"
        description="Define la estructura de los documentos de cada fase. Al trabajar un proyecto, cada documento parte de su plantilla."
        actions={actions}
      />

      {message && (
        <p role="status" className="rounded-lg border border-border/80 bg-surface px-3 py-2 text-[11.5px]">
          {message}
        </p>
      )}

      {error && !data ? (
        <ErrorState error={error} onRetry={() => void reload()} />
      ) : loading && !data ? (
        <LoadingState />
      ) : !templates.length ? (
        <EmptyState
          icon={LayoutTemplate}
          title="Aún no defines plantillas"
          description="Crea las tuyas o carga las plantillas base (Business Case, Project Charter, AS-IS / TO-BE, Data Map, Scope Statement, Cronograma y Plan de Gestión) y ajústalas a tu gusto. Stakeholders, requerimientos, riesgos y KPIs se registran en las pestañas de cada proyecto."
          className="py-16"
          action={actions}
        />
      ) : (
        PROJECT_PHASES.map((phase) => {
          const items = templates.filter((template) => template.phase === phase);
          const meta = PHASE_META[phase];
          return (
            <section key={phase} aria-labelledby={`phase-${meta.step}`}>
              <div className="mb-2.5 flex items-center justify-between gap-3">
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
                  <h2 id={`phase-${meta.step}`} className="text-[14px] font-semibold tracking-[-0.015em]">
                    {phase}
                  </h2>
                  <span className="rounded bg-default px-1.5 py-0.5 text-[9.5px] font-semibold tabular-nums text-muted">
                    {items.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => openModal(phase)}
                  className="h-7 gap-1 rounded-md px-2 text-[10.5px] text-muted"
                >
                  <Plus className="size-3.5" />
                  Agregar
                </Button>
              </div>

              {items.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((template) => {
                    const Icon = templateIcon(template.format);
                    return (
                      <Card
                        key={template.id}
                        className="group relative border border-border/80 bg-surface shadow-none transition-colors hover:border-accent/30"
                      >
                        <Button
                          variant="ghost"
                          aria-label={`Editar plantilla ${template.name}`}
                          onPress={() => navigate(`/templates/${template.id}`)}
                          className="absolute inset-0 z-10 h-full w-full rounded-xl bg-transparent p-0 data-[hovered]:bg-transparent data-[pressed]:bg-transparent"
                        />
                        <Card.Content className="pointer-events-none flex h-full flex-col p-4">
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "grid size-9 shrink-0 place-items-center rounded-lg",
                                meta.soft,
                                meta.text,
                              )}
                            >
                              <Icon className="size-[18px]" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12.5px] font-semibold transition-colors group-hover:text-brand">
                                {template.name}
                              </p>
                              <p className="text-[10px] text-muted">{template.format}</p>
                            </div>
                            <ArrowUpRight className="size-3.5 text-muted transition-colors group-hover:text-brand" />
                          </div>
                          {template.description && (
                            <p className="mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-muted">
                              {template.description}
                            </p>
                          )}
                          <p className="mt-auto pt-3 text-[9.5px] text-muted/80">
                            {template.document_count
                              ? `Usada en ${plural(template.document_count, "documento")}`
                              : "Sin documentos aún"}{" "}
                            · editada el {formatDate(template.updated_at)}
                          </p>
                        </Card.Content>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-4 text-[11px] text-muted">
                  Sin plantillas en esta fase.
                </p>
              )}
            </section>
          );
        })
      )}

      <NewTemplateModal
        key={modal.phase}
        isOpen={modal.open}
        initialPhase={modal.phase}
        onOpenChange={(open) => setModal((current) => ({ ...current, open }))}
      />
    </div>
  );
}
