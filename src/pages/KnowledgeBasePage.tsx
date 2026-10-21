import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Chip,
  Modal,
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
  Search,
  StickyNote,
  Workflow,
} from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/StateMessage";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/lib/api";
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

function CoursesSection() {
  const { data, loading, error, reload } =
    useApi<CourseCertification[]>("/courses");
  const courses = data ?? [];

  return (
    <section aria-labelledby="learning-heading">
      <div className="mb-2 flex items-center justify-between">
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
        <span className="inline-flex items-center gap-1.5 text-[10px] text-muted">
          <GraduationCap className="size-3.5" />
          {courses.length} programas
        </span>
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
                  <span
                    className={
                      course.completion_date
                        ? "shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "shrink-0 rounded bg-surface-secondary px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-muted"
                    }
                  >
                    {course.completion_date ? "Completado" : "En curso"}
                  </span>
                </div>
                <p className="mt-1 text-[9.5px] text-muted">
                  {course.platform ?? "Plataforma sin registrar"}
                  {course.completion_date &&
                    ` · ${formatDate(course.completion_date)}`}
                </p>
                {course.certificate_url && (
                  <a
                    href={course.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-brand hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    Ver certificado
                  </a>
                )}
              </Card.Content>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="Aún no hay cursos registrados"
        />
      )}
    </section>
  );
}

export function KnowledgeBasePage() {
  const { data, loading, error, reload } = useApi<GeneralNote[]>("/notes");
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof categories)[number]>("Todas");
  const [selectedNote, setSelectedNote] = useState<GeneralNote | null>(null);

  const notes = useMemo(() => data ?? [], [data]);

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
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-surface px-2.5 py-1.5 text-[10.5px] text-muted">
            <BookOpenCheck className="size-3.5 text-brand" />
            {notes.length} notas
          </div>
        }
      />

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
                      onPress={() => setSelectedNote(note)}
                      className="h-7 gap-1 rounded-md px-2 text-[9.5px] font-medium text-brand"
                    >
                      Leer
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
              : "Las notas que registres en la base de datos aparecerán aquí."
          }
          className="py-16"
        />
      )}

      <CoursesSection />

      <Modal.Backdrop
        isOpen={Boolean(selectedNote)}
        onOpenChange={(open) => {
          if (!open) setSelectedNote(null);
        }}
      >
        <Modal.Container size="lg" scroll="inside" placement="center">
          <Modal.Dialog className="max-w-[600px]">
            <Modal.CloseTrigger />
            {selectedNote && (
              <>
                <Modal.Header className="gap-1 border-b border-border/70 pb-4">
                  <Modal.Icon
                    className={`mb-1 ${styleFor(selectedNote).className}`}
                  >
                    {(() => {
                      const Icon = styleFor(selectedNote).icon;
                      return <Icon className="size-5" />;
                    })()}
                  </Modal.Icon>
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">
                    {styleFor(selectedNote).label}
                  </p>
                  <Modal.Heading className="text-lg font-semibold leading-snug tracking-[-0.025em]">
                    {selectedNote.title}
                  </Modal.Heading>
                  <p className="mt-1 text-[10px] text-muted">
                    Actualizada el {formatDate(selectedNote.updated_at)}
                  </p>
                </Modal.Header>
                <Modal.Body className="pt-4">
                  <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-muted">
                    {selectedNote.content ?? "Sin contenido"}
                  </p>

                  {selectedNote.tags.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                        Etiquetas
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedNote.tags.map((tag) => (
                          <Chip key={tag} size="sm" variant="soft" color="default">
                            {tag}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}
                </Modal.Body>
                <Modal.Footer className="border-t border-border/70 pt-4">
                  <Button
                    variant="primary"
                    onPress={() => setSelectedNote(null)}
                    className="h-9 rounded-lg text-[11.5px]"
                  >
                    Cerrar
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
