import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState({
    open: false,
    path: "",
  });
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const mobileOpen = mobileNav.open && mobileNav.path === location.pathname;

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileNav({ open: false, path: "" })}
      />

      {mobileOpen && (
        <Button
          aria-label="Cerrar menú de navegación"
          variant="ghost"
          onPress={() => setMobileNav({ open: false, path: "" })}
          className="fixed inset-0 z-40 h-dvh w-full rounded-none bg-slate-950/45 p-0 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <div className="flex h-dvh min-w-0 flex-1 flex-col">
        <Topbar
          onOpenMobile={() =>
            setMobileNav({ open: true, path: location.pathname })
          }
        />
        <main ref={mainRef} className="app-scrollbar flex-1 overflow-y-auto">
          <div
            key={location.pathname}
            className="animate-page-in mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
