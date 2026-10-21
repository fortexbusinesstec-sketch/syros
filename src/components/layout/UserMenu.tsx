import { Avatar, Dropdown } from "@heroui/react";
import {
  ChevronDown,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth, useCurrentUser } from "@/context/useAuth";
import { getInitials } from "@/lib/utils";

export function UserMenu() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { logout } = useAuth();

  return (
    <Dropdown>
      <Dropdown.Trigger className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-1.5 data-[hovered]:bg-default">
        <Avatar size="sm" color="accent" variant="soft">
          <Avatar.Fallback className="text-[11px] font-semibold">
            {getInitials(user.name)}
          </Avatar.Fallback>
        </Avatar>
        <span className="hidden min-w-0 flex-col items-start text-left xl:flex">
          <span className="max-w-[120px] truncate text-[12px] font-semibold leading-tight">
            {user.name}
          </span>
          <span className="max-w-[120px] truncate text-[10px] leading-tight text-muted">
            {user.email}
          </span>
        </span>
        <ChevronDown className="hidden size-3.5 text-muted xl:block" />
      </Dropdown.Trigger>
      <Dropdown.Popover className="min-w-[220px]">
        <Dropdown.Menu
          onAction={(key) => {
            if (key === "profile" || key === "settings") {
              navigate("/settings");
            }
            if (key === "logout") {
              void logout().then(() => navigate("/"));
            }
          }}
        >
          <Dropdown.Item id="profile" textValue="Mi perfil">
            <UserRound className="size-4 text-muted" />
            <span>Mi perfil</span>
          </Dropdown.Item>
          <Dropdown.Item id="settings" textValue="Configuración">
            <Settings className="size-4 text-muted" />
            <span>Configuración</span>
          </Dropdown.Item>
          <Dropdown.Item
            id="logout"
            textValue="Cerrar sesión"
            className="text-danger"
          >
            <LogOut className="size-4" />
            <span>Cerrar sesión</span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
