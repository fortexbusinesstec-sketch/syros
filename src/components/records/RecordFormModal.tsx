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
import { CircleAlert, Trash2, type LucideIcon } from "lucide-react";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export type FieldOption = string | { value: string; label: string };

export interface FieldDef {
  name: string;
  label: string;
  kind: "text" | "textarea" | "select" | "date" | "email";
  options?: readonly FieldOption[];
  required?: boolean;
  placeholder?: string;
  description?: string;
  /** Ocupa las dos columnas del formulario. */
  wide?: boolean;
  rows?: number;
}

export type FormValues = Record<string, string>;

interface RecordFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  fields: FieldDef[];
  initialValues: FormValues;
  submitLabel: string;
  /** Recibe los valores con los vacíos convertidos a null. */
  onSubmit: (values: Record<string, string | null>) => Promise<void>;
  onDelete?: () => Promise<void>;
  deleteLabel?: string;
  deleteConfirm?: string;
}

const NONE = "__none__";

function optionValue(option: FieldOption) {
  return typeof option === "string" ? option : option.value;
}

function optionLabel(option: FieldOption) {
  return typeof option === "string" ? option : option.label;
}

/**
 * Formulario modal para crear o editar un registro. Se monta de nuevo con cada apertura
 * (usar `key`), así parte siempre de `initialValues`.
 */
export function RecordFormModal({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  icon: Icon,
  fields,
  initialValues,
  submitLabel,
  onSubmit,
  onDelete,
  deleteLabel = "Eliminar",
  deleteConfirm = "¿Eliminar este registro? Esta acción no se puede deshacer.",
}: RecordFormModalProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"save" | "delete" | null>(null);

  const set = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (missing.includes(name)) setMissing((current) => current.filter((item) => item !== name));
  };

  const handleOpenChange = (open: boolean) => {
    if (pending) return;
    onOpenChange(open);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const empty = fields.filter((field) => field.required && !values[field.name]?.trim()).map((field) => field.name);
    setMissing(empty);
    if (empty.length) return;
    setPending("save");
    setError("");
    try {
      await onSubmit(
        Object.fromEntries(fields.map((field) => [field.name, values[field.name]?.trim() || null])),
      );
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo guardar.");
    } finally {
      setPending(null);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !window.confirm(deleteConfirm)) return;
    setPending("delete");
    setError("");
    try {
      await onDelete();
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo eliminar.");
    } finally {
      setPending(null);
    }
  };

  const formId = `record-form-${title.replace(/\W+/g, "-")}`;

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Container size="lg" scroll="inside" placement="center">
        <Modal.Dialog className="max-w-[640px]">
          <Modal.CloseTrigger />
          <Modal.Header className="gap-1 border-b border-border/70 pb-4">
            <Modal.Icon className="mb-2 bg-brand-soft text-brand dark:bg-brand/15 dark:text-blue-300">
              <Icon className="size-5" />
            </Modal.Icon>
            <Modal.Heading className="text-lg font-semibold tracking-[-0.025em]">{title}</Modal.Heading>
            {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
          </Modal.Header>

          <Modal.Body className="pt-5">
            <Form id={formId} onSubmit={handleSubmit} validationBehavior="aria" className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => {
                const invalid = missing.includes(field.name);
                const wide = field.wide || field.kind === "textarea";
                const className = cn(wide && "sm:col-span-2");

                if (field.kind === "select") {
                  const options = field.options ?? [];
                  return (
                    <Select
                      key={field.name}
                      value={values[field.name] || (field.required ? null : NONE)}
                      onChange={(key) => key !== null && set(field.name, key === NONE ? "" : String(key))}
                      isInvalid={invalid}
                      isRequired={field.required}
                      variant="secondary"
                      fullWidth
                      className={className}
                    >
                      <Label>{field.label}</Label>
                      <Select.Trigger>
                        <Select.Value>
                          {({ isPlaceholder, defaultChildren }) =>
                            isPlaceholder ? (field.placeholder ?? "Selecciona...") : defaultChildren
                          }
                        </Select.Value>
                        <Select.Indicator />
                      </Select.Trigger>
                      {field.description && <Description>{field.description}</Description>}
                      {invalid && <FieldError>Este campo es obligatorio.</FieldError>}
                      <Select.Popover>
                        <ListBox>
                          {!field.required && (
                            <ListBox.Item id={NONE} textValue="Sin definir">
                              <span className="text-muted">Sin definir</span>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          )}
                          {options.map((option) => (
                            <ListBox.Item
                              key={optionValue(option)}
                              id={optionValue(option)}
                              textValue={optionLabel(option)}
                            >
                              {optionLabel(option)}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  );
                }

                if (field.kind === "date") {
                  return (
                    <label key={field.name} className={cn("flex flex-col gap-1.5", className)}>
                      <span className="text-sm font-medium">{field.label}</span>
                      <input
                        type="date"
                        value={values[field.name] ?? ""}
                        onChange={(event) => set(field.name, event.target.value)}
                        className="h-10 w-full rounded-xl border border-transparent bg-default px-3 text-sm text-foreground outline-none transition-colors hover:bg-default-hover focus:border-accent/50 focus:ring-2 focus:ring-accent/20 dark:[color-scheme:dark]"
                      />
                      {field.description && <span className="text-xs text-muted">{field.description}</span>}
                    </label>
                  );
                }

                return (
                  <TextField
                    key={field.name}
                    type={field.kind === "email" ? "email" : "text"}
                    value={values[field.name] ?? ""}
                    onChange={(value) => set(field.name, value)}
                    isInvalid={invalid}
                    isRequired={field.required}
                    variant="secondary"
                    fullWidth
                    className={className}
                  >
                    <Label>{field.label}</Label>
                    {field.kind === "textarea" ? (
                      <TextArea rows={field.rows ?? 3} placeholder={field.placeholder} />
                    ) : (
                      <Input placeholder={field.placeholder} />
                    )}
                    {field.description && <Description>{field.description}</Description>}
                    <FieldError>Este campo es obligatorio.</FieldError>
                  </TextField>
                );
              })}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-[11px] text-danger-soft-foreground sm:col-span-2"
                >
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </Form>
          </Modal.Body>

          <Modal.Footer className="border-t border-border/70 pt-4">
            {onDelete && (
              <Button
                variant="ghost"
                isPending={pending === "delete"}
                isDisabled={pending !== null}
                onPress={() => void handleDelete()}
                className="mr-auto gap-1.5 text-danger"
              >
                <Trash2 className="size-4" />
                {deleteLabel}
              </Button>
            )}
            <Button variant="ghost" isDisabled={pending !== null} onPress={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              isPending={pending === "save"}
              isDisabled={pending !== null}
            >
              {submitLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
