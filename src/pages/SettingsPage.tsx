import { useState } from "react";
import type { FormEvent } from "react";
import {
  Avatar,
  Button,
  Card,
  Description,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import {
  Check,
  CheckCircle2,
  Globe2,
  KeyRound,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth, useCurrentUser } from "@/context/useAuth";
import { useProjects } from "@/context/useProjects";
import { useTheme } from "@/context/useTheme";
import { ApiError, apiFetch } from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";
import type { ThemeMode } from "@/context/theme-context";
import type { User } from "@/types";

const themeOptions: {
  value: ThemeMode;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "Claro",
    description: "Superficies luminosas",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Ideal para poca luz",
    icon: Moon,
  },
  {
    value: "system",
    label: "Sistema",
    description: "Sigue tu dispositivo",
    icon: Monitor,
  },
];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function ProfileCard() {
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("saving");
    setError("");
    try {
      const { user: updated } = await apiFetch<{ user: User }>("/auth/me", {
        method: "PATCH",
        body: { name },
      });
      setUser(updated);
      setState("saved");
      window.setTimeout(() => setState("idle"), 2200);
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo guardar el perfil."));
      setState("idle");
    }
  };

  return (
    <Card className="border border-border/80 bg-surface shadow-none">
      <Card.Header className="flex flex-row items-start gap-3 border-b border-border/70 p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <UserRound className="size-[18px]" />
        </span>
        <div>
          <Card.Title className="text-[13px] font-semibold">Perfil</Card.Title>
          <Card.Description className="mt-0.5 text-[10.5px] text-muted">
            Tu nombre se usa como responsable de los proyectos que crees.
          </Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="p-5">
        <div className="mb-5 flex items-center gap-3">
          <Avatar size="lg" color="accent" variant="soft">
            <Avatar.Fallback className="text-[13px] font-semibold">
              {getInitials(user.name)}
            </Avatar.Fallback>
          </Avatar>
          <div>
            <p className="text-[12px] font-semibold">{user.name}</p>
            <p className="text-[10.5px] text-muted">
              Cuenta creada el {formatDate(user.created_at)}
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[8.5px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldCheck className="size-2.5" />
              Cuenta única de acceso
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              value={name}
              onChange={setName}
              isDisabled={state === "saving"}
              variant="secondary"
              fullWidth
            >
              <Label>Nombre completo</Label>
              <Input />
            </TextField>
            <TextField
              type="email"
              value={user.email}
              isReadOnly
              variant="secondary"
              fullWidth
            >
              <Label>Correo de acceso</Label>
              <Input />
              <Description>Es tu usuario para iniciar sesión.</Description>
            </TextField>
          </div>

          {error && (
            <p role="alert" className="text-[11px] text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              isPending={state === "saving"}
              isDisabled={name.trim() === user.name}
              className="h-9 gap-1.5 rounded-lg px-3.5 text-[11.5px]"
            >
              {state === "saved" ? (
                <Check className="size-3.5" />
              ) : (
                <UserRound className="size-3.5" />
              )}
              {state === "saved" ? "Cambios guardados" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (next.length < 10) {
      setError("La nueva contraseña debe tener al menos 10 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    setState("saving");
    try {
      await apiFetch("/auth/password", {
        method: "POST",
        body: { current, next },
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setState("saved");
      window.setTimeout(() => setState("idle"), 2500);
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo cambiar la contraseña."));
      setState("idle");
    }
  };

  return (
    <Card className="border border-border/80 bg-surface shadow-none">
      <Card.Header className="flex flex-row items-start gap-3 border-b border-border/70 p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          <KeyRound className="size-[18px]" />
        </span>
        <div>
          <Card.Title className="text-[13px] font-semibold">
            Contraseña
          </Card.Title>
          <Card.Description className="mt-0.5 text-[10.5px] text-muted">
            Al cambiarla se cierran las sesiones abiertas en otros dispositivos.
          </Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={setCurrent}
            isDisabled={state === "saving"}
            variant="secondary"
            fullWidth
          >
            <Label>Contraseña actual</Label>
            <Input />
          </TextField>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={setNext}
              isDisabled={state === "saving"}
              variant="secondary"
              fullWidth
            >
              <Label>Nueva contraseña</Label>
              <Input />
              <Description>Mínimo 10 caracteres.</Description>
            </TextField>
            <TextField
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
              isDisabled={state === "saving"}
              variant="secondary"
              fullWidth
            >
              <Label>Confirmar nueva contraseña</Label>
              <Input />
            </TextField>
          </div>

          {error && (
            <p role="alert" className="text-[11px] text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              isPending={state === "saving"}
              isDisabled={!current || !next || !confirm}
              className="h-9 gap-1.5 rounded-lg px-3.5 text-[11.5px]"
            >
              {state === "saved" ? (
                <Check className="size-3.5" />
              ) : (
                <KeyRound className="size-3.5" />
              )}
              {state === "saved" ? "Contraseña actualizada" : "Cambiar contraseña"}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { projects } = useProjects();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tu cuenta"
        title="Configuración"
        description="Administra tu perfil, tu contraseña y la apariencia del workspace."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <ProfileCard />
          <PasswordCard />

          <Card className="border border-border/80 bg-surface shadow-none">
            <Card.Header className="flex flex-row items-start gap-3 border-b border-border/70 p-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                <Globe2 className="size-[18px]" />
              </span>
              <div>
                <Card.Title className="text-[13px] font-semibold">
                  Preferencias regionales
                </Card.Title>
                <Card.Description className="mt-0.5 text-[10.5px] text-muted">
                  Formato de fechas y zona horaria del workspace.
                </Card.Description>
              </div>
            </Card.Header>
            <Card.Content className="divide-y divide-border/70 p-0">
              <div className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-[11.5px] font-medium">Idioma</p>
                  <p className="text-[10px] text-muted">
                    Interfaz y notificaciones
                  </p>
                </div>
                <span className="rounded-md border border-border/80 bg-surface-secondary/50 px-2 py-1 text-[10px] font-medium">
                  Español (Perú)
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-[11.5px] font-medium">Zona horaria</p>
                  <p className="text-[10px] text-muted">
                    Fechas y recordatorios
                  </p>
                </div>
                <span className="rounded-md border border-border/80 bg-surface-secondary/50 px-2 py-1 text-[10px] font-medium">
                  La de este dispositivo
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-[11.5px] font-medium">Formato de fecha</p>
                  <p className="text-[10px] text-muted">
                    Aplicado en todo el workspace
                  </p>
                </div>
                <span className="rounded-md border border-border/80 bg-surface-secondary/50 px-2 py-1 text-[10px] font-medium">
                  DD MMM YYYY
                </span>
              </div>
            </Card.Content>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border border-border/80 bg-surface shadow-none">
            <Card.Header className="p-5 pb-0">
              <Card.Title className="text-[13px] font-semibold">
                Apariencia
              </Card.Title>
              <Card.Description className="mt-0.5 text-[10.5px] text-muted">
                Elige cómo se ve Process Hub en este dispositivo.
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-2 p-5">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;
                return (
                  <Button
                    key={option.value}
                    variant="ghost"
                    onPress={() => setTheme(option.value)}
                    className={cn(
                      "h-auto w-full justify-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      active
                        ? "border-brand/40 bg-brand-soft/60 dark:border-brand/30 dark:bg-brand/10"
                        : "border-border/80 hover:border-border-secondary hover:bg-surface-secondary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg",
                        active
                          ? "bg-brand text-white"
                          : "bg-surface-secondary text-muted",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] font-semibold">
                        {option.label}
                      </span>
                      <span className="block text-[10px] font-normal text-muted">
                        {option.description}
                      </span>
                    </span>
                    {active && (
                      <CheckCircle2 className="size-4 shrink-0 text-brand" />
                    )}
                  </Button>
                );
              })}
            </Card.Content>
          </Card>

          <Card className="border border-border/80 bg-surface shadow-none">
            <Card.Header className="p-5 pb-0">
              <Card.Title className="text-[13px] font-semibold">
                Workspace
              </Card.Title>
              <Card.Description className="mt-0.5 text-[10.5px] text-muted">
                Datos almacenados en Turso
              </Card.Description>
            </Card.Header>
            <Card.Content className="p-5">
              <div className="space-y-2 text-[10.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Proyectos en portafolio</span>
                  <span className="font-semibold tabular-nums">
                    {projects.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Proyectos activos</span>
                  <span className="font-semibold tabular-nums">
                    {projects.filter((project) => project.status === "Activo").length}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-[9.5px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                  Los datos se leen en vivo desde la base de datos y se
                  refrescan cada 30 segundos. Se requiere conexión a internet.
                </p>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}
