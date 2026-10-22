import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Chip,
  SearchField,
} from "@heroui/react";
import {
  ArrowUpRight,
  BookOpenCheck,
  Bot,
  Compass,
  Database,
  ExternalLink,
  FileText,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Workflow,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/StateMessage";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecordFormModal, type FieldDef } from "@/components/records/RecordFormModal";
import { toFormValues, useRecordModal } from "@/components/records/helpers";
import { ApiError, mutate, useApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { NOTE_CATEGORIES } from "@/types/domain";
import type { CourseCertification, GeneralNote, NoteCategory } from "@/types";

const categoryStyles: Record<
  NoteCategory | "none",
  { icon: typeof Workflow; className: string; label: string }
> = {
  Proceso: {
    icon: Workflow,
    label: "Proceso",
    className:
      "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  },
  Automatización: {
    icon: Bot,
    label: "Automatización",
    className:
      "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  },
  Datos: {
    icon: Database,
    label: "Datos",
    className:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  Metodología: {
    icon: Compass,
    label: "Metodología",
    className:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
  none: {
    icon: StickyNote,
    label: "Sin categoría",
    className: "bg-surface-secondary text-muted",
  },
};

const categories = ["Todas", ...NOTE_CATEGORIES] as const;

function styleFor(note: GeneralNote) {
  return categoryStyles[note.category ?? "none"] ?? categoryStyles.none;
}

const COURSE_FIELDS: FieldDef[] = [
  { name: "name", label: "Nombre del curso", kind: "text", required: true, wide: true },
  { name: "platform", label: "Plataforma", kind: "text", placeholder: "Ej. Coursera" },
  { name: "completion_date", label: "Fecha de finalización", kind: "date" },
  {
    name: "certificate_url",
    label: "URL del certificado",
    kind: "text",
    wide: true,
    placeholder: "https://...",
  },
];

function CoursesSection() {
  const navigate = useNavigate();
  const { data, loading, error, reload } =
    useApi<CourseCertification[]>("/courses");
  const courseModal = useRecordModal<CourseCertification>();
  const courses = data ?? [];

  const saveCourse = async (values: Record<string, string | null>) => {
    if (courseModal.record) {
      await mutate("PATCH", `/courses/${courseModal.record.id}`, values);
    } else {
      const { id } = await mutate<{ id: string }>("POST", "/courses", values);
      navigate(`/knowledge/courses/${id}`);
    }
  };

  const modal = (
    <RecordFormModal
      key={`course-${courseModal.key}`}
      isOpen={courseModal.open}
      onOpenChange={courseModal.setOpen}
      icon={GraduationCap}
      title={courseModal.record ? "Editar curso" : "Nuevo curso"}
      subtitle="Formación y certificaciones"
      fields={COURSE_FIELDS}
      initialValues={
        courseModal.record
          ? toFormValues(courseModal.record, COURSE_FIELDS.map((field) => field.name))
          : {}
      }
      submitLabel={courseModal.record ? "Guardar cambios" : "Crear curso"}
      onSubmit={saveCourse}
      deleteLabel="Eliminar curso"
      onDelete={
        courseModal.record
          ? () => mutate("DELETE", `/courses/${courseModal.record!.id}`).then(() => undefined)
          : undefined
      }
    />
  );

  return (
    <section aria-labelledby="learning-heading">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2
            id="learning-heading"
            className="text-[14px] font-semibold tracking-[-0.015em]"
          >
            Cursos y certificaciones
          </h2>
          <p className="mt-0.5 text-[10.5px] text-muted">
            Formación registrada y su estado
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[10px] text-muted sm:inline-flex">
            <GraduationCap className="size-3.5" />
            {courses.length} programas
          </span>
          <Button
            variant="primary"
            size="sm"
            onPress={() => courseModal.openNew()}
            className="h-8 gap-1.5 rounded-lg text-[10.5px]"
          >
            <Plus className="size-3.5" />
            Nuevo curso
          </Button>
        </div>
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={() => void reload()} />
      ) : loading && !data ? (
        <LoadingState />
      ) : courses.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="border border-border/80 bg-surface shadow-none"
            >
              <Card.Content className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-[11.5px] font-semibold leading-snug">
                    {course.name}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={
                        course.completion_date
                          ? "rounded bg-emerald-50 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "rounded bg-surface-secondary px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-muted"
                      }
                    >
                      {course.completion_date ? "Completado" : "En curso"}
                    </span>
                    <Button
                      isIconOnly
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar ${course.name}`}
                      onPress={() => courseModal.openEdit(course)}
                      className="size-6 min-w-6 rounded-md text-muted"
                    >
                      <Pencil className="size-3" />
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-[9.5px] text-muted">
                  {course.platform ?? "Plataforma sin registrar"}
                  {course.completion_date &&
                    ` · ${formatDate(course.completion_date)}`}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {course.certificate_url ? (
                    <a
                      href={course.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-brand hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      Ver certificado
                    </a>
                  ) : (
                    <span />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => navigate(`/knowledge/courses/${course.id}`)}
                    className="h-7 gap-1 rounded-md px-2 text-[9.5px] font-medium text-brand"
                  >
                    <FileText className="size-3" />
                    Apuntes
                  </Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="Aún no hay cursos registrados"
          description="Registra cursos y certificaciones para llevar el control de tu formación."
          action={
            <Button
              variant="primary"
              size="sm"
              onPress={() => courseModal.openNew()}
              className="h-8 gap-1.5 rounded-lg text-[11px]"
            >
              <Plus className="size-3.5" />
              Nuevo curso
            </Button>
          }
        />
      )}

      {modal}
    </section>
  );
}

export function KnowledgeBasePage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi<GeneralNote[]>("/notes");
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof categories)[number]>("Todas");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const notes = useMemo(() => data ?? [], [data]);

  const createNote = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const { id } = await mutate<{ id: string }>("POST", "/notes", {
        title: "Nueva nota",
        content: "",
      });
      navigate(`/knowledge/${id}`);
    } catch (caught) {
      setCreateError(
        caught instanceof ApiError ? caught.message : "No se pudo crear la nota.",
      );
    } finally {
      setCreating(false);
    }
  };

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesCategory =
        category === "Todas" || note.category === category;
      const matchesQuery =
        !normalized ||
        [note.title, note.content ?? "", ...note.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, notes, query]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Recursos"
        title="Base de conocimiento"
        description="Notas, estándares y aprendizajes reutilizables para cada implementación."
        actions={
          <>
            <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-surface px-2.5 py-1.5 text-[10.5px] text-muted">
              <BookOpenCheck className="size-3.5 text-brand" />
              {notes.length} notas
            </div>
            <Button
              variant="primary"
              size="sm"
              isPending={creating}
              onPress={() => void createNote()}
              className="h-8 gap-1.5 rounded-lg text-[10.5px]"
            >
              <Plus className="size-3.5" />
              Nueva nota
            </Button>
          </>
        }
      />

      {createError && (
        <p role="alert" className="text-[11px] text-danger">
          {createError}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-surface p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="app-scrollbar flex items-center gap-1 overflow-x-auto">
          {categories.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={category === item ? "primary" : "ghost"}
              onPress={() => setCategory(item)}
              className={
                category === item
                  ? "h-8 shrink-0 rounded-lg px-3 text-[10.5px]"
                  : "h-8 shrink-0 rounded-lg px-3 text-[10.5px] text-muted"
              }
            >
              {item}
            </Button>
          ))}
        </div>
        <div className="w-full lg:w-[260px]">
          <SearchField
            aria-label="Buscar en la base de conocimiento"
            variant="secondary"
            value={query}
            onChange={setQuery}
          >
            <SearchField.Group className="h-9 rounded-lg">
              <SearchField.SearchIcon>
                <Search className="size-4" />
              </SearchField.SearchIcon>
              <SearchField.Input
                placeholder="Buscar notas..."
                className="text-[11.5px]"
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={() => void reload()} />
      ) : loading && !data ? (
        <LoadingState />
      ) : filteredNotes.length > 0 ? (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {filteredNotes.map((note) => {
            const meta = styleFor(note);
            const Icon = meta.icon;
            return (
              <Card
                key={note.id}
                className="group flex flex-col border border-border/80 bg-surface shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30"
              >
                <Card.Content className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`grid size-9 place-items-center rounded-xl ${meta.className}`}
                    >
                      <Icon className="size-[18px]" />
                    </span>
                    <Chip size="sm" variant="soft" color="default">
                      {meta.label}
                    </Chip>
                  </div>

                  <h2 className="mt-4 line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-[-0.015em]">
                    {note.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-3 flex-1 text-[11px] leading-relaxed text-muted">
                    {note.content ?? "Sin contenido"}
                  </p>

                  {note.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
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

                  <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
                    <span className="text-[9.5px] text-muted">
                      Actualizada el {formatDate(note.updated_at)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => navigate(`/knowledge/${note.id}`)}
                      className="h-7 gap-1 rounded-md px-2 text-[9.5px] font-medium text-brand"
                    >
                      Abrir
                      <ArrowUpRight className="size-3" />
                    </Button>
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={notes.length ? "No encontramos notas" : "Aún no hay notas"}
          description={
            notes.length
              ? "Prueba otro término o cambia la categoría seleccionada."
              : "Crea tu primera nota con el editor de documentos."
          }
          action={
            !notes.length ? (
              <Button
                variant="primary"
                size="sm"
                isPending={creating}
                onPress={() => void createNote()}
                className="h-8 gap-1.5 rounded-lg text-[11px]"
              >
                <Plus className="size-3.5" />
                Nueva nota
              </Button>
            ) : undefined
          }
          className="py-16"
        />
      )}

      <CoursesSection />
    </div>
  );
}
