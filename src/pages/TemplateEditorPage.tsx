import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Button,
  Card,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";
import { ArrowLeft, Check, FileX, Info, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "@/components/common/StateMessage";
import { ContentEditor } from "@/components/documents/ContentEditor";
import { SaveIndicator } from "@/components/documents/SaveIndicator";
import { ApiError, apiFetch, invalidate, mutate } from "@/lib/api";
import { PROJECT_PHASES } from "@/lib/constants";
import { useAutosave } from "@/lib/useAutosave";
import { plural } from "@/lib/utils";
import { TEMPLATE_FORMATS } from "@/types/domain";
import type { ProjectPhase, TemplateDetail, TemplateFormat } from "@/types";

/** Un editor por plantilla: así un guardado pendiente nunca se aplica a otra plantilla. */
export function TemplateEditorPage() {
  const { templateId } = useParams();
  return <TemplateEditor key={templateId} />;
}

function TemplateEditor() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [content, setContent] = useState("");
  const [meta, setMeta] = useState({ name: "", phase: "Iniciación" as ProjectPhase, format: "Documento" as TemplateFormat, description: "" });
  const [metaState, setMetaState] = useState<"idle" | "saving" | "saved">("idle");
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState<ApiError | null>(null);

  const fetchTemplate = useCallback(
    () =>
      apiFetch<TemplateDetail>(`/templates/${templateId}`)
        .then((loaded) => {
          setTemplate(loaded);
          setContent(loaded.content);
          setMeta({ name: loaded.name, phase: loaded.phase, format: loaded.format, description: loaded.description ?? "" });
        })
        .catch((error: unknown) =>
          setLoadError(error instanceof ApiError ? error : new ApiError(0, String(error))),
        ),
    [templateId],
  );

  useEffect(() => {
    void fetchTemplate();
  }, [fetchTemplate]);

  const load = () => {
    setLoadError(null);
    void fetchTemplate();
  };

  const autosave = useAutosave(
    useCallback(
      async (value: string) => {
        await apiFetch(`/templates/${templateId}`, { method: "PATCH", body: { content: value } });
        void invalidate("/templates");
      },
      [templateId],
    ),
  );

  const handleChange = (value: string) => {
    setContent(value);
    autosave.schedule(value);
  };

  const metaChanged =
    template !== null &&
    (meta.name.trim() !== template.name ||
      meta.phase !== template.phase ||
      meta.format !== template.format ||
      meta.description.trim() !== (template.description ?? ""));

  const saveMeta = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!template) return;
    setActionError("");
    setMetaState("saving");
    try {
      await mutate("PATCH", `/templates/${template.id}`, {
        name: meta.name.trim(),
        phase: meta.phase,
        format: meta.format,
        description: meta.description.trim(),
      });
      setTemplate({
        ...template,
        name: meta.name.trim(),
        phase: meta.phase,
        format: meta.format,
        description: meta.description.trim() || null,
      });
      // El contenido depende del formato: si cambió, el que estaba en memoria ya no aplica.
      if (meta.format !== template.format) setContent("");
      setMetaState("saved");
      window.setTimeout(() => setMetaState("idle"), 2000);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "No se pudieron guardar los datos.");
      setMetaState("idle");
    }
  };

  const remove = async () => {
    if (!template) return;
    if (!window.confirm(`¿Eliminar la plantilla "${template.name}"?`)) return;
    setActionError("");
    try {
      await mutate("DELETE", `/templates/${template.id}`);
      navigate("/templates");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "No se pudo eliminar la plantilla.");
    }
  };

  if (loadError) {
    return loadError.status === 404 ? (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <FileX className="size-7 text-muted" />
        <h1 className="mt-3 text-[18px] font-semibold">Plantilla no encontrada</h1>
        <Button
          variant="primary"
          onPress={() => navigate("/templates")}
          className="mt-4 h-9 rounded-lg text-[11.5px]"
        >
          <ArrowLeft className="size-3.5" />
          Volver a plantillas
        </Button>
      </div>
    ) : (
      <ErrorState error={loadError} onRetry={load} />
    );
  }
  if (!template) return <LoadingState className="min-h-[60vh]" />;

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onPress={() => navigate("/templates")}
        className="h-8 -translate-x-1 gap-1.5 rounded-lg px-2 text-[10.5px] text-muted"
      >
        <ArrowLeft className="size-3.5" />
        Plantillas
      </Button>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Plantilla · {template.format}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.035em]">
            {template.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <SaveIndicator
            state={autosave.state}
            lastSavedAt={autosave.lastSavedAt}
            error={autosave.error}
            onSave={() => void autosave.flush()}
          />
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            aria-label="Eliminar plantilla"
            onPress={() => void remove()}
            className="size-8 rounded-lg text-muted hover:text-danger"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 bg-surface shadow-none">
        <Card.Content className="p-4">
          <form onSubmit={saveMeta} className="grid gap-3 md:grid-cols-[1fr_170px_170px_1.4fr_auto] md:items-end">
            <TextField
              value={meta.name}
              onChange={(name) => setMeta((current) => ({ ...current, name }))}
              variant="secondary"
              fullWidth
            >
              <Label>Nombre</Label>
              <Input />
            </TextField>
            <Select
              value={meta.phase}
              onChange={(key) =>
                key !== null && setMeta((current) => ({ ...current, phase: String(key) as ProjectPhase }))
              }
              variant="secondary"
              fullWidth
            >
              <Label>Fase</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {PROJECT_PHASES.map((phase) => (
                    <ListBox.Item key={phase} id={phase} textValue={phase}>
                      {phase}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              value={meta.format}
              onChange={(key) =>
                key !== null && setMeta((current) => ({ ...current, format: String(key) as TemplateFormat }))
              }
              variant="secondary"
              fullWidth
            >
              <Label>Tipo</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {TEMPLATE_FORMATS.map((format) => (
                    <ListBox.Item key={format} id={format} textValue={format}>
                      {format}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <TextField
              value={meta.description}
              onChange={(description) => setMeta((current) => ({ ...current, description }))}
              variant="secondary"
              fullWidth
            >
              <Label>Descripción</Label>
              <Input placeholder="Para qué sirve este documento" />
            </TextField>
            <Button
              type="submit"
              variant="secondary"
              isPending={metaState === "saving"}
              isDisabled={!metaChanged || meta.name.trim().length < 2}
              className="h-10 gap-1.5 rounded-lg text-[11px]"
            >
              {metaState === "saved" && <Check className="size-3.5" />}
              {metaState === "saved" ? "Guardado" : "Guardar datos"}
            </Button>
          </form>
          {actionError && (
            <p role="alert" className="mt-2 text-[11px] text-danger">
              {actionError}
            </p>
          )}
          <p className="mt-3 flex items-start gap-1.5 text-[10.5px] text-muted">
            <Info className="mt-px size-3.5 shrink-0" />
            Los cambios aplican a los documentos que crees desde ahora.
            {template.document_count === 1 && " El documento ya creado conserva su propio contenido."}
            {template.document_count > 1 &&
              ` Los ${plural(template.document_count, "documento")} ya creados conservan su propio contenido.`}
            {" Cambiar el tipo reinicia el contenido de la plantilla (el XML BPMN y la imagen no son compatibles)."}
          </p>
        </Card.Content>
      </Card>

      <ContentEditor
        format={template.format}
        content={content}
        onChange={handleChange}
        title={`Plantilla - ${template.name}`}
      />
    </div>
  );
}
