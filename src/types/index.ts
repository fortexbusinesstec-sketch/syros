import type {
  DocumentStatus,
  EngagementLevel,
  ImpactLevel,
  InfluenceLevel,
  InterestLevel,
  KanbanStatus,
  KpiFrequency,
  KpiStatus,
  NoteCategory,
  Priority,
  ProjectPhase,
  ProjectStatus,
  ReminderStatus,
  RequirementStatus,
  RequirementType,
  RiskCategory,
  RiskResponse,
  RiskStatus,
  SprintStatus,
  TemplateFormat,
} from "@/types/domain";

export type * from "@/types/domain";

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  current_phase: ProjectPhase;
  status: ProjectStatus;
  start_date: string | null;
  estimated_end_date: string | null;
  created_at: string;
  owner: string | null;
  team: string[];
  tags: string[];
  /** Porcentaje de tareas de sprint en "Done". 0 si el proyecto no tiene tareas. */
  progress: number;
  task_total: number;
  document_count: number;
  stakeholder_count: number;
  requirement_count: number;
  open_risk_count: number;
  kpi_count: number;
}

export interface Stakeholder {
  id: string;
  project_id: string;
  name: string;
  role: string | null;
  company_area: string | null;
  email: string | null;
  phone: string | null;
  influence: InfluenceLevel;
  interest: InterestLevel;
  engagement: EngagementLevel;
  notes: string | null;
}

export interface Requirement {
  id: string;
  project_id: string;
  type: RequirementType;
  code: string | null;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  parent_id: string | null;
  priority: Priority;
  status: RequirementStatus;
}

export interface Risk {
  id: string;
  project_id: string;
  description: string;
  category: RiskCategory | null;
  probability: Priority | null;
  impact: ImpactLevel | null;
  response: RiskResponse | null;
  mitigation_plan: string | null;
  owner: string | null;
  status: RiskStatus;
}

export interface Kpi {
  id: string;
  project_id: string;
  stakeholder_id: string | null;
  stakeholder_name: string | null;
  name: string;
  description: string | null;
  metric: string | null;
  unit: string | null;
  baseline_value: string | null;
  target_value: string | null;
  actual_value: string | null;
  frequency: KpiFrequency | null;
  status: KpiStatus;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  project_name: string;
  template_id: string;
  name: string;
  phase: ProjectPhase;
  format: TemplateFormat;
  status: DocumentStatus;
  updated_at: string;
}

export interface ProjectDocumentDetail extends ProjectDocument {
  content: string;
  /** JSON serializado de ImageDoc (o cadena vacía si no hay imagen). */
  image: string;
}

export interface Template {
  id: string;
  phase: ProjectPhase;
  name: string;
  format: TemplateFormat;
  description: string | null;
  position: number;
  document_count: number;
  updated_at: string;
}

export interface TemplateDetail extends Template {
  content: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: SprintStatus;
}

export interface SprintTask {
  id: string;
  sprint_id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  kanban_status: KanbanStatus;
  priority: Priority;
  due_date: string | null;
  tag: string | null;
}

export interface TaskReminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: ReminderStatus;
  priority: Priority;
  project_id: string | null;
  project_name: string | null;
}

export interface GeneralNote {
  id: string;
  title: string;
  content: string | null;
  category: NoteCategory | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CourseCertification {
  id: string;
  name: string;
  platform: string | null;
  completion_date: string | null;
  certificate_url: string | null;
  learning_doc: string | null;
  created_at: string;
}

export interface Milestone {
  kind: "project" | "sprint";
  label: string;
  date: string;
  project_id: string;
}

export interface Summary {
  projects: { total: number; active: number };
  sprints: { active: number };
  reminders: { open: number; high: number; overdue: number };
  documents: { total: number; recent: number };
  next_milestone: Milestone | null;
}
