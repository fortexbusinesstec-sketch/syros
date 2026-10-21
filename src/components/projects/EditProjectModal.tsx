import { FolderPen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RecordFormModal, type FieldDef } from "@/components/records/RecordFormModal";
import { mutate } from "@/lib/api";
import { PROJECT_PHASES, PROJECT_STATUSES } from "@/lib/constants";
import type { Project } from "@/types";

const FIELDS: FieldDef[] = [
  { name: "name", label: "Nombre del proyecto", kind: "text", required: true, wide: true },
  { name: "description", label: "Descripción", kind: "textarea", rows: 3 },
  { name: "current_phase", label: "Fase actual", kind: "select", options: PROJECT_PHASES, required: true },
  { name: "status", label: "Estado", kind: "select", options: PROJECT_STATUSES, required: true },
  { name: "start_date", label: "Fecha de inicio", kind: "date" },
  { name: "estimated_end_date", label: "Cierre estimado", kind: "date" },
  { name: "owner", label: "Responsable", kind: "text" },
  { name: "tags", label: "Etiquetas", kind: "text", description: "Separadas por comas." },
  { name: "team", label: "Equipo", kind: "text", wide: true, description: "Nombres separados por comas." },
];

const list = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectModal({ project, isOpen, onOpenChange }: EditProjectModalProps) {
  const navigate = useNavigate();

  return (
    <RecordFormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      icon={FolderPen}
      title="Editar proyecto"
      fields={FIELDS}
      initialValues={{
        name: project.name,
        description: project.description ?? "",
        current_phase: project.current_phase,
        status: project.status,
        start_date: project.start_date ?? "",
        estimated_end_date: project.estimated_end_date ?? "",
        owner: project.owner ?? "",
        tags: project.tags.join(", "),
        team: project.team.join(", "),
      }}
      submitLabel="Guardar cambios"
      onSubmit={async (values) => {
        await mutate("PATCH", `/projects/${project.id}`, {
          ...values,
          tags: list(values.tags),
          team: list(values.team),
        });
      }}
      deleteLabel="Eliminar proyecto"
      deleteConfirm={`Se eliminará "${project.name}" con todos sus documentos, registros y tareas. Esta acción no se puede deshacer. ¿Continuar?`}
      onDelete={async () => {
        await mutate("DELETE", `/projects/${project.id}`);
        navigate("/projects");
      }}
    />
  );
}
