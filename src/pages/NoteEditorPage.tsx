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
import { ArrowLeft, Check, FileX, StickyNote, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "@/components/common/StateMessage";
import { ContentEditor } from "@/components/documents/ContentEditor";
import { SaveIndicator } from "@/components/documents/SaveIndicator";
import { ApiError, apiFetch, invalidate, mutate } from "@/lib/api";
import { useAutosave } from "@/lib/useAutosave";
import { formatDateTime } from "@/lib/utils";
import { NOTE_CATEGORIES } from "@/types/domain";
import type { GeneralNote, NoteCategory } from "@/types";

const NONE = "__none__";

/** Un editor por nota: así un guardado pendiente nunca se aplica a otra nota. */
export function NoteEditorPage() {
  const { noteId } = useParams();
  return <NoteEditor key={noteId} />;
}

function NoteEditor() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<GeneralNote | null>(null);
  const [content, setContent] = useState("");
  const [meta, setMeta] = useState({ title: "", category: "" as NoteCategory | "" });
  const [metaState, setMetaState] = useState<"idle" | "saving" | "saved">("idle");
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState<ApiError | null>(null);

  const fetchNote = useCallback(
    () =>
      apiFetch<GeneralNote>(`/notes/${noteId}`)
        .then((loaded) => {
          setNote(loaded);
          setContent(loaded.content ?? "");
          setMeta({ title: loaded.title, category: loaded.category ?? "" });
        })
        .catch((error: unknown) =>
          setLoadError(error instanceof ApiError ? error : new ApiError(0, String(error))),
        ),
    [noteId],
  );

  useEffect(() => {
    void fetchNote();
  }, [fetchNote]);

  const load = () => {
    setLoadError(null);
    void fetchNote();
  };

  const autosave = useAutosave(
    useCallback(
      async (value: string) => {
        await apiFetch(`/notes/${noteId}`, { method: "PATCH", body: { content: value } });
        void invalidate("/notes");
      },
      [noteId],
    ),
  );

  const handleChange = (value: string) => {
    setContent(value);
    autosave.schedule(value);
  };

  const metaChanged =
    note !== null &&
    (meta.title.trim() !== note.title || (meta.category || null) !== note.category);

  const saveMeta = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!note) return;
    setActionError("");
    setMetaState("saving");
    try {
      await mutate("PATCH", `/notes/${note.id}`, {
        title: meta.title.trim(),
        category: meta.category || null,
      });
      setNote({ ...note, title: meta.title.trim(), category: meta.category || null });
      setMetaState("saved");
      window.setTimeout(() => setMetaState("idle"), 2000);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "No se pudieron guardar los datos.");
      setMetaState("idle");
    }
  };

  const remove = async () => {
    if (!note) return;
    if (!window.confirm(`¿Eliminar la nota "${note.title}"? Esta acción no se puede deshacer.`)) return;
    setActionError("");
    try {
      await mutate("DELETE", `/notes/${note.id}`);
      navigate("/knowledge");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "No se pudo eliminar la nota.");
    }
  };

  if (loadError) {
    return loadError.status === 404 ? (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <FileX className="size-7 text-muted" />
        <h1 className="mt-3 text-[18px] font-semibold">Nota no encontrada</h1>
        <Button
          variant="primary"
          onPress={() => navigate("/knowledge")}
          className="mt-4 h-9 rounded-lg text-[11.5px]"
        >
          <ArrowLeft className="size-3.5" />
          Volver a la base de conocimiento
        </Button>
      </div>
    ) : (
      <ErrorState error={loadError} onRetry={load} />
    );
  }
  if (!note) return <LoadingState className="min-h-[60vh]" />;

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onPress={() => navigate("/knowledge")}
        className="h-8 -translate-x-1 gap-1.5 rounded-lg px-2 text-[10.5px] text-muted"
      >
        <ArrowLeft className="size-3.5" />
        Base de conocimiento
      </Button>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            <StickyNote className="size-3.5 text-brand" />
            Nota · {note.category ?? "Sin categoría"}
          </p>
          <h1 className="mt-1 line-clamp-2 text-[22px] font-semibold leading-tight tracking-[-0.035em]">
            {note.title}
          </h1>
          <p className="mt-1 text-[10.5px] text-muted">
            Última modificación: {formatDateTime(note.updated_at)}
          </p>
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
            aria-label="Eliminar nota"
            onPress={() => void remove()}
            className="size-8 rounded-lg text-muted hover:text-danger"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 bg-surface shadow-none">
        <Card.Content className="p-4">
          <form onSubmit={saveMeta} className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
            <TextField
              value={meta.title}
              onChange={(title) => setMeta((current) => ({ ...current, title }))}
              variant="secondary"
              isRequired
              fullWidth
            >
              <Label>Título</Label>
              <Input placeholder="Título de la nota" />
            </TextField>
            <Select
              value={meta.category || NONE}
              onChange={(key) =>
                key !== null &&
                setMeta((current) => ({
                  ...current,
                  category: key === NONE ? "" : (String(key) as NoteCategory),
                }))
              }
              variant="secondary"
              fullWidth
            >
              <Label>Categoría</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id={NONE} textValue="Sin categoría">
                    <span className="text-muted">Sin categoría</span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {NOTE_CATEGORIES.map((category) => (
                    <ListBox.Item key={category} id={category} textValue={category}>
                      {category}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Button
              type="submit"
              variant="secondary"
              isPending={metaState === "saving"}
              isDisabled={!metaChanged || meta.title.trim().length < 2}
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
          {note.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-border/80 bg-surface-secondary/50 px-1.5 py-0.5 text-[9px] font-medium text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

      <ContentEditor
        format="Documento"
        content={content}
        onChange={handleChange}
        title={`Nota - ${note.title}`}
      />
    </div>
  );
}
