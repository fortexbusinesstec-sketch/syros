import { useCallback } from "react";
import type { ReactNode } from "react";
import {
  ProjectsContext,
  type NewProjectInput,
} from "@/context/projects-context";
import { mutate, useApi } from "@/lib/api";
import type { Project } from "@/types";

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useApi<Project[]>("/projects");

  const addProject = useCallback(
    (input: NewProjectInput) => mutate<Project>("POST", "/projects", input),
    [],
  );

  return (
    <ProjectsContext.Provider
      value={{ projects: data ?? [], loading, error, reload, addProject }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}
