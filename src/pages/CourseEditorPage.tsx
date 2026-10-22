import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button, Card, Input, Label, TextField } from "@heroui/react";
import { ArrowLeft, Check, FileX, GraduationCap, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "@/components/common/StateMessage";
import { ContentEditor } from "@/components/documents/ContentEditor";
import { SaveIndicator } from "@/components/documents/SaveIndicator";
import { ApiError, apiFetch, invalidate, mutate } from "@/lib/api";
import { useAutosave } from "@/lib/useAutosave";
import { formatDate } from "@/lib/utils";
import type { CourseCertification } from "@/types";

/** Un editor por curso: así un guardado pendiente nunca se aplica a otro curso. */
export function CourseEditorPage() {
  const { courseId } = useParams();
  return <CourseEditor key={courseId} />;
}

function CourseEditor() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseCertification | null>(null);
  const [content, setContent] = useState("");
  const [meta, setMeta] = useState({
    name: "",
    platform: "",
    completion_date: "",
    certificate_url: "",
  });
  const [metaState, setMetaState] = useState<"idle" | "saving" | "saved">("idle");
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState<ApiError | null>(null);

  const fetchCourse = useCallback(
    () =>
      apiFetch<CourseCertification>(`/courses/${courseId}`)
        .then((loaded) => {
          setCourse(loaded);
          setContent(loaded.learning_doc ?? "");
          setMeta({
            name: loaded.name,
            platform: loaded.platform ?? "",
            completion_date: (loaded.completion_date ?? "").slice(0, 10),
            certificate_url: loaded.certificate_url ?? "",
          });
        })
        .catch((error: unknown) =>
          setLoadError(error instanceof ApiError ? error : new ApiError(0, String(error))),
        ),
    [courseId],
  );

  useEffect(() => {
    void fetchCourse();
  }, [fetchCourse]);

  const load = () => {
    setLoadError(null);
    void fetchCourse();
  };

  const autosave = useAutosave(
    useCallback(
      async (value: string) => {
        await apiFetch(`/courses/${courseId}`, {
          method: "PATCH",
          body: { learning_doc: value },
        });
        void invalidate("/courses");
      },
      [courseId],
    ),
  );

  const handleChange = (value: string) => {
    setContent(value);
    autosave.schedule(value);
  };

  const metaChanged =
    course !== null &&
    (meta.name.trim() !== course.name ||
      meta.platform.trim() !== (course.platform ?? "") ||
      (meta.completion_date || null) !== course.completion_date ||
      meta.certificate_url.trim() !== (course.certificate_url ?? ""));

  const saveMeta = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!course) return;
    setActionError("");
    setMetaState("saving");
    const values = {
      name: meta.name.trim(),
      platform: meta.platform.trim() || null,
      completion_date: meta.completion_date || null,
      certificate_url: meta.certificate_url.trim() || null,
    };
    try {
      await mutate("PATCH", `/courses/${course.id}`, values);
      setCourse({ ...course, ...values });
      setMetaState("saved");
      window.setTimeout(() => setMetaState("idle"), 2000);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "No se pudieron guardar los datos.");
      setMetaState("idle");
    }
  };

  const remove = async () => {
    if (!course) return;
    if (!window.confirm(`¿Eliminar el curso "${course.name}" y sus apuntes? Esta acción no se puede deshacer.`)) {
      return;
    }
    setActionError("");
    try {
      await mutate("DELETE", `/courses/${course.id}`);
      navigate("/knowledge");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "No se pudo eliminar el curso.");
    }
  };

  if (loadError) {
    return loadError.status === 404 ? (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <FileX className="size-7 text-muted" />
        <h1 className="mt-3 text-[18px] font-semibold">Curso no encontrado</h1>
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
  if (!course) return <LoadingState className="min-h-[60vh]" />;

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
            <GraduationCap className="size-3.5 text-brand" />
            Curso · {course.completion_date ? "Completado" : "En curso"}
          </p>
          <h1 className="mt-1 line-clamp-2 text-[22px] font-semibold leading-tight tracking-[-0.035em]">
            {course.name}
          </h1>
          <p className="mt-1 text-[10.5px] text-muted">
            {course.platform ?? "Plataforma sin registrar"}
            {course.completion_date && ` · ${formatDate(course.completion_date)}`}
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
            aria-label="Eliminar curso"
            onPress={() => void remove()}
            className="size-8 rounded-lg text-muted hover:text-danger"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 bg-surface shadow-none">
        <Card.Content className="p-4">
          <form
            onSubmit={saveMeta}
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_180px_1.4fr_auto] xl:items-end"
          >
            <TextField
              value={meta.name}
              onChange={(name) => setMeta((current) => ({ ...current, name }))}
              variant="secondary"
              isRequired
              fullWidth
            >
              <Label>Nombre del curso</Label>
              <Input />
            </TextField>
            <TextField
              value={meta.platform}
              onChange={(platform) => setMeta((current) => ({ ...current, platform }))}
              variant="secondary"
              fullWidth
            >
              <Label>Plataforma</Label>
              <Input placeholder="Ej. Coursera" />
            </TextField>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Fecha de finalización</span>
              <input
                type="date"
                value={meta.completion_date}
                onChange={(event) =>
                  setMeta((current) => ({ ...current, completion_date: event.target.value }))
                }
                className="h-10 w-full rounded-xl border border-transparent bg-default px-3 text-sm text-foreground outline-none transition-colors hover:bg-default-hover focus:border-accent/50 focus:ring-2 focus:ring-accent/20 dark:[color-scheme:dark]"
              />
            </label>
            <TextField
              value={meta.certificate_url}
              onChange={(certificate_url) => setMeta((current) => ({ ...current, certificate_url }))}
              variant="secondary"
              fullWidth
            >
              <Label>URL del certificado</Label>
              <Input placeholder="https://..." />
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
        </Card.Content>
      </Card>

      <ContentEditor
        format="Documento"
        content={content}
        onChange={handleChange}
        title={`Apuntes - ${course.name}`}
      />
    </div>
  );
}
