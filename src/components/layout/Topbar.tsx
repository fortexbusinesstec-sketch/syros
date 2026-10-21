import { Button } from "@heroui/react";
import { ChevronRight, Menu, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Brand } from "@/components/layout/Brand";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { NotificationsMenu } from "@/components/layout/NotificationsMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { getPageTitle } from "@/components/layout/navigation";

interface TopbarProps {
  onOpenMobile: () => void;
}

export function Topbar({ onOpenMobile }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/80 bg-surface/85 px-3 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label="Abrir menú de navegación"
          onPress={onOpenMobile}
          className="size-9 rounded-lg text-muted lg:hidden"
        >
          <Menu className="size-[19px]" />
        </Button>

        <div className="lg:hidden">
          <Brand compact />
        </div>

        <div className="hidden min-w-0 items-center gap-2 text-[12px] lg:flex">
          <span className="font-medium text-muted/80">Process Hub</span>
          <ChevronRight className="size-3 text-muted/50" />
          <span className="truncate font-semibold text-foreground">
            {pageTitle}
          </span>
        </div>
      </div>

      <div className="hidden w-full max-w-[330px] shrink-0 md:block">
        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label="Buscar proyectos"
          onPress={() => navigate("/projects")}
          className="size-9 rounded-lg text-muted md:hidden"
        >
          <Search className="size-[18px]" />
        </Button>
        <NotificationsMenu />
        <ThemeToggle />
        <span className="mx-1.5 hidden h-6 w-px bg-border sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
