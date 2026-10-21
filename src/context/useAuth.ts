import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

/** Usuario de la sesión. Solo para componentes que se renderizan con sesión iniciada. */
export function useCurrentUser() {
  const { user } = useAuth();
  if (!user) {
    throw new Error("useCurrentUser requiere una sesión iniciada");
  }
  return user;
}
