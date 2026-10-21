import { Button } from "@heroui/react";
import { Compass, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-border/80 bg-surface text-brand shadow-sm">
        <Compass className="size-7" />
      </span>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
        Error 404
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em]">
        Página no encontrada
      </h1>
      <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-muted">
        La ruta que buscas no existe o cambió de lugar. Vuelve al dashboard para
        continuar trabajando.
      </p>
      <Button
        variant="primary"
        onPress={() => navigate("/")}
        className="mt-5 h-9 gap-1.5 rounded-lg px-3.5 text-[11.5px]"
      >
        <Home className="size-3.5" />
        Ir al dashboard
      </Button>
    </div>
  );
}
