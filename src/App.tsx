import { Outlet, Route, Routes } from "react-router-dom";
import { LoadingState } from "@/components/common/StateMessage";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectsProvider } from "@/context/ProjectsProvider";
import { useAuth } from "@/context/useAuth";
import { DashboardPage } from "@/pages/DashboardPage";
import { CourseEditorPage } from "@/pages/CourseEditorPage";
import { DocumentEditorPage } from "@/pages/DocumentEditorPage";
import { KnowledgeBasePage } from "@/pages/KnowledgeBasePage";
import { LoginPage } from "@/pages/LoginPage";
import { NoteEditorPage } from "@/pages/NoteEditorPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TasksPage } from "@/pages/TasksPage";
import { TemplateEditorPage } from "@/pages/TemplateEditorPage";
import { TemplatesPage } from "@/pages/TemplatesPage";

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingState label="Comprobando sesión..." className="min-h-dvh" />;
  }
  if (status === "anonymous") {
    return <LoginPage />;
  }

  return (
    <ProjectsProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route
            path="projects/:projectId/docs/:documentId"
            element={<DocumentEditorPage />}
          />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="templates/:templateId" element={<TemplateEditorPage />} />
          <Route path="knowledge" element={<KnowledgeBasePage />} />
          <Route path="knowledge/:noteId" element={<NoteEditorPage />} />
          <Route path="knowledge/courses/:courseId" element={<CourseEditorPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ProjectsProvider>
  );
}
