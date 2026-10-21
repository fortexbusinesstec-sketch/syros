import { useState } from "react";
import type { FormEvent } from "react";
import {
  Button,
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
import { CircleAlert, LayoutTemplate } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiError, mutate } from "@/lib/api";
import { PROJECT_PHASES } from "@/lib/constants";
import { TEMPLATE_FORMATS } from "@/types/domain";
import type { ProjectPhase, TemplateFormat } from "@/types";

interface NewTemplateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialPhase?: ProjectPhase;
}

const formatHelp: Record<TemplateFormat, string> = {
  Documento: "Editor con títulos, listas, tablas estructuradas, diagramas Mermaid y código.",
  "Diagrama BPMN": "Modelador de procesos BPMN 2.0, ideal para el AS-IS y el TO-BE.",
};

export function NewTemplateModal({
  isOpen,
  onOpenChange,
  initialPhase = "Iniciación",
}: NewTemplateModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<ProjectPhase>(initialPhase);
  const [format, setFormat] = useState<TemplateFormat>("Documento");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);

  const reset = () => {
    setName("");
    setPhase(initialPhase);
    setFormat("Documento");
    setDescription("");
    setNameError("");
    setSubmitError("");
  };

  const handleOpenChange = (open: boolean) => {
    if (pending) return;
    if (!open) reset();
    onOpenChange(open);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setNameError("Ingresa un nombre de al menos 2 caracteres.");
      return;
    }
    setPending(true);
    setSubmitError("");
    try {
      const { id } = await mutate<{ id: string }>("POST", "/templates", {
        name: name.trim(),
        phase,
        format,
        description: description.trim(),
      });
      onOpenChange(false);
      reset();
      navigate(`/templates/${id}`);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : "No se pudo crear la plantilla.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Container size="lg" scroll="inside" placement="center">
        <Modal.Dialog className="max-w-[560px]">
          <Modal.CloseTrigger />
          <Modal.Header className="gap-1 border-b border-border/70 pb-5">
            <Modal.Icon className="mb-2 bg-brand-soft text-brand dark:bg-brand/15 dark:text-blue-300">
              <LayoutTemplate className="size-5" />
            </Modal.Icon>
            <Modal.Heading className="text-lg font-semibold tracking-[-0.025em]">
              Nueva plantilla
            </Modal.Heading>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Define la estructura una vez; cada proyecto parte de ella al crear su documento.
            </p>
          </Modal.Header>

          <Modal.Body className="pt-5">
            <Form
              id="new-template-form"
              onSubmit={handleSubmit}
              validationBehavior="aria"
              className="space-y-5"
            >
              <TextField
                isRequired
                value={name}
                onChange={(value) => {
                  setName(value);
                  if (nameError) setNameError("");
                }}
                isInvalid={Boolean(nameError)}
                variant="secondary"
                fullWidth
              >
                <Label>Nombre</Label>
                <Input placeholder="Ej. Business Case" />
                <FieldError>{nameError}</FieldError>
              </TextField>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  value={phase}
                  onChange={(key) => key !== null && setPhase(String(key) as ProjectPhase)}
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
                      {PROJECT_PHASES.map((item) => (
                        <ListBox.Item key={item} id={item} textValue={item}>
                          {item}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  value={format}
                  onChange={(key) => key !== null && setFormat(String(key) as TemplateFormat)}
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
                      {TEMPLATE_FORMATS.map((item) => (
                        <ListBox.Item key={item} id={item} textValue={item}>
                          {item}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              <p className="-mt-3 text-[11px] text-muted">{formatHelp[format]}</p>

              <TextField value={description} onChange={setDescription} variant="secondary" fullWidth>
                <Label>Descripción</Label>
                <TextArea rows={2} placeholder="Para qué sirve este documento..." />
                <Description>Opcional.</Description>
              </TextField>

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
            <Button variant="ghost" isDisabled={pending} onPress={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="new-template-form" variant="primary" isPending={pending}>
              <LayoutTemplate className="size-4" />
              {pending ? "Creando..." : "Crear y editar"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
