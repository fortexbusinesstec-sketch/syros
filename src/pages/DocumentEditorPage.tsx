import { useCallback, useEffect, useState } from "react";
import { Button, Dropdown } from "@heroui/react";
import { ArrowLeft, ChevronDown, FileX, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "@/components/common/StateMessage";
import { ContentEditor } from "@/components/documents/ContentEditor";
import { SaveIndicator } from "@/components/documents/SaveIndicator";
import { ApiError, apiFetch, invalidate, mutate } from "@/lib/api";
import { PHASE_META } from "@/lib/constants";
import { useAutosave } from "@/lib/useAutosave";
import { cn, formatDateTime } from "@/lib/utils";
import { DOCUMENT_STATUSES } from "@/types/domain";
import type { DocumentStatus, ProjectDocumentDetail } from "@/types";

const statusDot: Record<DocumentStatus, string> = {
  Borrador: "bg-slate-400",
  "En Revisión": "bg-amber-500",
  Aprobado: "bg-emerald-500",
};

/** Un editor por documento: así un guardado pendiente nunca se aplica a otro documento. */
export function DocumentEditorPage() {
  const { documentId } = useParams();
  return <DocumentEditor key={documentId} />;
}

function DocumentEditor() {
  const { projectId, documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState<ProjectDocumentDetail | null>(null);
  const [content, setContent] = useState("");
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [statusError, setStatusError] = useState("");

  const fetchDocument = useCallback(
    () =>
      apiFetch<ProjectDocumentDetail>(`/documents/${documentId}`)
        .then((loaded) => {
          setDocument(loaded);
          setContent(loaded.content);
        })
        .catch((error: unknown) =>
          setLoadError(error instanceof ApiError ? error : new ApiError(0, String(error))),
        ),
    [documentId],
  );

  useEffect(() => {
    void fetchDocument();
  }, [fetchDocument]);

  const load = () => {
    setLoadError(null);
    void fetchDocument();
  };

  const autosave = useAutosave(
    useCallback(
      async (value: string) => {
        // Sin invalidar toda la caché en cada pulsación: solo los listados de documentos.
        await apiFetch(`/documents/${documentId}`, { method: "PATCH", body: { content: value } });
        void invalidate(`/projects/${projectId}/documents`);
        void invalidate("/documents/recent");
      },
      [documentId, projectId],
    ),
  );

  const handleChange = (value: string) => {
    setContent(value);
    autosave.schedule(value);
  };

  const changeStatus = async (status: DocumentStatus) => {
    if (!document || status === document.status) return;
    setStatusError("");
    try {
      await mutate("PATCH", `/documents/${document.id}`, { status });
      setDocument({ ...document, status });
    } catch (error) {
      setStatusError(error instanceof ApiError ? error.message : "No se pudo cambiar el estado");
    }
  };

  const remove = async () => {
    if (!document) return;
    if (!window.confirm(`¿Eliminar el documento "${document.name}" de este proyecto? Esta acción no se puede deshacer.`)) {
      return;
    }
    await mutate("DELETE", `/documents/${document.id}`);
    navigate(`/projects/${projectId}?tab=documentacion`);
  };

  const back = () => navigate(`/projects/${projectId}?tab=documentacion`);

  if (loadError) {
    return loadError.status === 404 ? (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <FileX className="size-7 text-muted" />
        <h1 className="mt-3 text-[18px] font-semibold">Documento no encontrado</h1>
        <Button variant="primary" onPress={back} className="mt-4 h-9 rounded-lg text-[11.5px]">
          <ArrowLeft className="size-3.5" />
          Volver al proyecto
        </Button>
      </div>
    ) : (
      <ErrorState error={loadError} onRetry={load} />
    );
  }
  if (!document) return <LoadingState className="min-h-[60vh]" />;

  const phase = PHASE_META[document.phase] ?? PHASE_META.Iniciación;

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onPress={back}
        className="h-8 -translate-x-1 gap-1.5 rounded-lg px-2 text-[10.5px] text-muted"
      >
        <ArrowLeft className="size-3.5" />
        {document.project_name}
      </Button>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold",
                phase.soft,
                phase.text,
              )}
            >
              <span className={cn("size-1.5 rounded-full", phase.dot)} />
              {document.phase}
            </span>
            <span className="rounded-md border border-border/80 px-1.5 py-0.5 text-[9.5px] font-medium text-muted">
              {document.format}
            </span>
          </div>
          <h1 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.035em]">
            {document.name}
          </h1>
          <p className="mt-1 text-[10.5px] text-muted">
            Última modificación: {formatDateTime(document.updated_at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SaveIndicator
            state={autosave.state}
            lastSavedAt={autosave.lastSavedAt}
            error={autosave.error}
            onSave={() => void autosave.flush()}
          />
          <Dropdown>
            <Dropdown.Trigger
              aria-label="Estado del documento"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-[10.5px] font-medium transition-colors hover:bg-surface-secondary"
            >
              <span className={cn("size-1.5 rounded-full", statusDot[document.status])} />
              {document.status}
              <ChevronDown className="size-3.5 text-muted" />
            </Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu
                selectionMode="single"
                selectedKeys={[document.status]}
                onAction={(key) => void changeStatus(String(key) as DocumentStatus)}
              >
                {DOCUMENT_STATUSES.map((status) => (
                  <Dropdown.Item key={status} id={status} textValue={status}>
                    <span className={cn("size-1.5 rounded-full", statusDot[status])} />
                    {status}
                    <Dropdown.ItemIndicator />
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            aria-label="Eliminar documento"
            onPress={() => void remove()}
            className="size-8 rounded-lg text-muted hover:text-danger"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {statusError && (
        <p role="alert" className="text-[11px] text-danger">
          {statusError}
        </p>
      )}

      <ContentEditor
        format={document.format}
        content={content}
        onChange={handleChange}
        title={`${document.project_name} - ${document.name}`}
      />
    </div>
  );
}
