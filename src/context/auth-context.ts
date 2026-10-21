import { createContext } from "react";
import type { User } from "@/types";

export interface AuthContextValue {
  user: User | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
