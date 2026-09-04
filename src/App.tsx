import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Projects from "./pages/Projects";
import MyProjects from "./pages/MyProjects";
import MyProjectTasks from "./pages/MyProjectTasks";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/clients"
              element={
                <ProtectedRoute roles={["SUPER_ADMIN"]}>
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/:clientId"
              element={
                <ProtectedRoute roles={["SUPER_ADMIN"]}>
                  <ClientDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute roles={["SUPER_ADMIN", "PROGRAM_MANAGER"]}>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-projects"
              element={
                <ProtectedRoute roles={["EMPLOYEE"]}>
                  <MyProjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-projects/:projectId"
              element={
                <ProtectedRoute roles={["EMPLOYEE"]}>
                  <MyProjectTasks />
                </ProtectedRoute>
              }
            />
            <Route path="/projects/:projectId" element={<ProjectWorkspace />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={["SUPER_ADMIN"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
