import { useContext } from "react";
import { ProjectsContext } from "@/context/projects-context";

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects debe usarse dentro de ProjectsProvider");
  }
  return context;
}
