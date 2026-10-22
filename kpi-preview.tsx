import { createRoot } from "react-dom/client";
import { Card } from "@heroui/react";
import { StatusChip } from "@/components/records/shared";
import "@/styles/globals.css";

function Preview() {
  return (
    <div className="min-h-dvh bg-background p-8">
      <Card className="border border-border/80 bg-surface shadow-none">
        <Card.Content className="app-scrollbar overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-[11px]">
            <thead className="border-b border-border/70 text-[9.5px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">KPI</th>
                <th className="px-3 py-2 font-semibold">Fórmula</th>
                <th className="px-3 py-2 font-semibold">Frecuencia</th>
                <th className="px-3 py-2 text-right font-semibold">Línea base</th>
                <th className="px-3 py-2 text-right font-semibold">Meta</th>
                <th className="px-3 py-2 text-right font-semibold">Actual</th>
                <th className="px-4 py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {["Sin medir", "En meta", "En riesgo", "Fuera de meta"].map((status) => (
                <tr key={status}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">Tiempo de aprobación de vacaciones</p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted">Descripción corta</p>
                  </td>
                  <td className="px-3 py-2.5 text-muted">Promedio de días de aprobación por área</td>
                  <td className="px-3 py-2.5 text-muted">Mensual</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">12 días</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">3 días</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">5 días</td>
                  <td className="px-4 py-2.5">
                    <StatusChip
                      value={status}
                      done={["En meta"]}
                      warn={["En riesgo", "Fuera de meta"]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Preview />);
