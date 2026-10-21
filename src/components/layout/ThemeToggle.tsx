import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/useTheme";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      isIconOnly
      variant="ghost"
      size="sm"
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      onPress={toggleTheme}
      className="size-9 rounded-lg text-muted transition-colors hover:text-foreground"
    >
      {isDark ? (
        <Sun className="size-[18px]" />
      ) : (
        <Moon className="size-[18px]" />
      )}
    </Button>
  );
}
