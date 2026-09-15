import { apiClient } from "./client";
import type { ProjectStatus } from "./projects";
import type { TaskStatus } from "./tasks";

export interface EmployeeDashboardProject {
  project_id: string;
  project_name: string;
  client_id: string;
  client_name: string;
  project_status: ProjectStatus;
}

export interface EmployeeDashboardTask {
  task_id: string;
  task_name: string;
  project_name: string;
  status: TaskStatus;
  due_date: string | null;
}

export interface EmployeeDashboard {
  role: "EMPLOYEE";
  active_projects: number;
  remaining_tasks: number;
  draft_timesheets: number;
  projects: EmployeeDashboardProject[];
  tasks: EmployeeDashboardTask[];
}

export interface ManagerDashboardProject {
  project_id: string;
  project_name: string;
  client_id: string;
  client_name: string;
  status: ProjectStatus;
  project_start_date: string;
  project_end_date: string | null;
  team_size: number;
  budget_hours: number | null;
  hours_logged: number;
}

export interface ManagerDashboard {
  role: "PROJECT_MANAGER";
  my_projects: number;
  clients: number;
  team_members: number;
  pending_approvals: number;
  hours_awaiting_approval: number;
  projects: ManagerDashboardProject[];
}

export interface AdminDashboard {
  role: "SUPER_ADMIN";
  total_clients: number;
  active_projects: number;
  total_employees: number;
  pending_approvals: number;
  hours_awaiting_approval: number;
}

export type Dashboard = EmployeeDashboard | ManagerDashboard | AdminDashboard;

export async function getDashboard(): Promise<Dashboard> {
  const { data } = await apiClient.get<Dashboard>("/dashboard");
  return data;
}
