import { useState } from "react";
import type { FormEvent } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { CircleAlert, LockKeyhole, LogIn } from "lucide-react";
import { Brand } from "@/components/layout/Brand";
import { useAuth } from "@/context/useAuth";
import { ApiError } from "@/lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y tu contraseña.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await login(email, password);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "No se pudo iniciar sesión. Inténtalo de nuevo.",
      );
      setPassword("");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-[380px]">
        <Brand className="mb-6 justify-center" />
        <Card className="border border-border/80 bg-surface shadow-none">
          <Card.Header className="gap-1 border-b border-border/70 p-6 pb-5">
            <span className="mb-2 grid size-9 place-items-center rounded-xl bg-brand-soft text-brand dark:bg-brand/15 dark:text-blue-300">
              <LockKeyhole className="size-[18px]" />
            </span>
            <Card.Title className="text-[17px] font-semibold tracking-[-0.025em]">
              Iniciar sesión
            </Card.Title>
            <Card.Description className="text-[11.5px] text-muted">
              Acceso privado al espacio de trabajo.
            </Card.Description>
          </Card.Header>
          <Card.Content className="p-6">
            <Form
              onSubmit={handleSubmit}
              validationBehavior="aria"
              className="space-y-4"
            >
              <TextField
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={setEmail}
                isDisabled={pending}
                variant="secondary"
                fullWidth
              >
                <Label>Correo</Label>
                <Input placeholder="nombre@empresa.com" />
              </TextField>

              <TextField
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
                isDisabled={pending}
                isInvalid={Boolean(error)}
                variant="secondary"
                fullWidth
              >
                <Label>Contraseña</Label>
                <Input />
              </TextField>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-[11px] text-danger-soft-foreground"
                >
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isPending={pending}
                className="h-10 gap-2 rounded-lg text-[12.5px] font-semibold"
              >
                <LogIn className="size-4" />
                {pending ? "Verificando..." : "Entrar"}
              </Button>
            </Form>
          </Card.Content>
        </Card>
      </div>
    </main>
  );
}
