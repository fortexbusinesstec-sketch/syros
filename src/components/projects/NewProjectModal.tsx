import { useState } from "react";
import type { FormEvent } from "react";
import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  TextField,
} from "@heroui/react";
import {
  CalendarDays,
  CircleAlert,
  FolderPlus,
  Layers3,
  Sparkles,
} from "lucide-react";
import {
  CalendarDate,
  getLocalTimeZone,
  today,
} from "@internationalized/date";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/context/useAuth";
import { useProjects } from "@/context/useProjects";
import { ApiError } from "@/lib/api";
import { PROJECT_PHASES, PROJECT_STATUSES } from "@/lib/constants";
import type { ProjectPhase, ProjectStatus } from "@/types";

interface NewProjectModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface FormState {
  name: string;
  description: string;
  current_phase: ProjectPhase;
  status: ProjectStatus;
}

const initialForm: FormState = {
  name: "",
  description: "",
  current_phase: "Iniciación",
  status: "Activo",
};

export function NewProjectModal({
  isOpen,
  onOpenChange,
}: NewProjectModalProps) {
  const { addProject } = useProjects();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [endDate, setEndDate] = useState<CalendarDate | null>(null);
  const [nameError, setNameError] = useState("");
  const [dateError, setDateError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);

  const resetForm = () => {
    setForm(initialForm);
    setEndDate(null);
    setNameError("");
    setDateError("");
    setSubmitError("");
  };

  const handleOpenChange = (open: boolean) => {
    if (pending) return;
    if (!open) resetForm();
    onOpenChange(open);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextNameError =
      form.name.trim().length < 3
        ? "Ingresa un nombre de al menos 3 caracteres."
        : "";
    const nextDateError = !endDate
      ? "Selecciona una fecha estimada de cierre."
      : "";

    setNameError(nextNameError);
    setDateError(nextDateError);

    if (nextNameError || nextDateError || !endDate) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      current_phase: form.current_phase,
      status: form.status,
      estimated_end_date: endDate.toString(),
    };

    setPending(true);
    setSubmitError("");
    try {
      const project = await addProject(payload);
      onOpenChange(false);
      resetForm();
      navigate(`/projects/${project.id}`);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "No se pudo crear el proyecto. Inténtalo de nuevo.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Container size="lg" scroll="inside" placement="center">
        <Modal.Dialog className="max-w-[640px]">
          <Modal.CloseTrigger />
          <Modal.Header className="gap-1 border-b border-border/70 pb-5">
            <Modal.Icon className="mb-2 bg-brand-soft text-brand dark:bg-brand/15 dark:text-blue-300">
              <FolderPlus className="size-5" />
            </Modal.Icon>
            <Modal.Heading className="text-lg font-semibold tracking-[-0.025em]">
              Nuevo proyecto
            </Modal.Heading>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Define el alcance inicial. Podrás completar el equipo, los
              documentos y las tareas desde el detalle del proyecto.
            </p>
          </Modal.Header>

          <Modal.Body className="pt-5">
            <Form
              id="new-project-form"
              onSubmit={handleSubmit}
              validationBehavior="aria"
              className="space-y-5"
            >
              <TextField
                isRequired
                name="name"
                value={form.name}
                onChange={(value) => {
                  setForm((current) => ({ ...current, name: value }));
                  if (nameError) setNameError("");
                }}
                isInvalid={Boolean(nameError)}
                variant="secondary"
                fullWidth
              >
                <Label>Nombre del proyecto</Label>
                <Input placeholder="Ej. Automatización de conciliaciones" />
                <Description>
                  Usa un nombre claro que identifique el proceso o iniciativa.
                </Description>
                <FieldError>{nameError}</FieldError>
              </TextField>

              <TextField
                name="description"
                value={form.description}
                onChange={(value) =>
                  setForm((current) => ({ ...current, description: value }))
                }
                variant="secondary"
                fullWidth
              >
                <Label>Descripción</Label>
                <TextArea
                  rows={3}
                  placeholder="Objetivo, alcance y resultado esperado del proyecto..."
                />
                <Description>
                  Opcional. Ayuda al equipo a entender el contexto.
                </Description>
              </TextField>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  value={form.current_phase}
                  onChange={(key) => {
                    if (key === null) return;
                    setForm((current) => ({
                      ...current,
                      current_phase: String(key) as ProjectPhase,
                    }));
                  }}
                  variant="secondary"
                  fullWidth
                >
                  <Label>Fase actual</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {PROJECT_PHASES.map((phase) => (
                        <ListBox.Item
                          key={phase}
                          id={phase}
                          textValue={phase}
                        >
                          {phase}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  value={form.status}
                  onChange={(key) => {
                    if (key === null) return;
                    setForm((current) => ({
                      ...current,
                      status: String(key) as ProjectStatus,
                    }));
                  }}
                  variant="secondary"
                  fullWidth
                >
                  <Label>Estado</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {PROJECT_STATUSES.map((status) => (
                        <ListBox.Item
                          key={status}
                          id={status}
                          textValue={status}
                        >
                          {status}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              <DatePicker
                value={endDate}
                onChange={(value) => {
                  setEndDate(value as CalendarDate | null);
                  if (dateError) setDateError("");
                }}
                isRequired
                isInvalid={Boolean(dateError)}
              >
                <Label>Fecha estimada de cierre</Label>
                <DateField.Group variant="secondary" fullWidth>
                  <DateField.Input>
                    {(segment) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                  <DateField.Suffix>
                    <DatePicker.Trigger aria-label="Abrir calendario">
                      <DatePicker.TriggerIndicator>
                        <CalendarDays className="size-4" />
                      </DatePicker.TriggerIndicator>
                    </DatePicker.Trigger>
                  </DateField.Suffix>
                </DateField.Group>
                <Description>
                  Podrás ajustarla a medida que avance el proyecto.
                </Description>
                <FieldError>{dateError}</FieldError>
                <DatePicker.Popover>
                  <Calendar
                    aria-label="Seleccionar fecha estimada de cierre"
                    minValue={today(getLocalTimeZone())}
                  >
                    <Calendar.Header>
                      <Calendar.NavButton slot="previous" />
                      <Calendar.Heading />
                      <Calendar.NavButton slot="next" />
                    </Calendar.Header>
                    <Calendar.Grid>
                      <Calendar.GridHeader>
                        {(day) => (
                          <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                        )}
                      </Calendar.GridHeader>
                      <Calendar.GridBody>
                        {(date) => <Calendar.Cell date={date} />}
                      </Calendar.GridBody>
                    </Calendar.Grid>
                  </Calendar>
                </DatePicker.Popover>
              </DatePicker>

              <div className="flex gap-3 rounded-xl border border-border/80 bg-surface-secondary/50 p-3.5">
                <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand dark:bg-brand/15 dark:text-blue-300">
                  <Sparkles className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold">
                    Se creará con fase {form.current_phase}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                    La fecha de inicio será hoy y el responsable inicial será{" "}
                    {user.name}.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-[10.5px] leading-relaxed text-muted">
                <Layers3 className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Los campos marcados con{" "}
                  <span className="font-semibold text-danger">*</span> son
                  obligatorios.
                </span>
              </div>

              {nameError || dateError ? (
                <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-[11px] text-danger-soft-foreground">
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                  <span>Revisa los campos obligatorios antes de continuar.</span>
                </div>
              ) : null}

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-[11px] text-danger-soft-foreground"
                >
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </Form>
          </Modal.Body>

          <Modal.Footer className="border-t border-border/70 pt-4">
            <Button
              type="button"
              variant="ghost"
              isDisabled={pending}
              onPress={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="new-project-form"
              variant="primary"
              isPending={pending}
            >
              <FolderPlus className="size-4" />
              {pending ? "Guardando..." : "Crear proyecto"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
