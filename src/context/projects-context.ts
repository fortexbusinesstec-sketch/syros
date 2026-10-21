import { createContext } from "react";
import type { ApiError } from "@/lib/api";
import type { Project, ProjectPhase, ProjectStatus } from "@/types";

export interface NewProjectInput {
  name: string;
  description: string;
  current_phase: ProjectPhase;
  status: ProjectStatus;
  estimated_end_date: string;
}

export interface ProjectsContextValue {
  projects: Project[];
  loading: boolean;
  error: ApiError | undefined;
  reload: () => Promise<void>;
  addProject: (input: NewProjectInput) => Promise<Project>;
}

export const ProjectsContext = createContext<ProjectsContextValue | null>(null);
