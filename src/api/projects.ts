import { apiClient } from "./client";
import type { PaginatedResponse } from "./clients";

export interface Project {
  project_id: string;
  project_name: string;
  client_id: string;
  project_manager_id: string;
  client_spoc_id: string | null;
  project_start_date: string;
  project_end_date: string | null;
  project_description: string | null;
  budget_hours: number | null;
  status: string;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ProjectCreateInput {
  project_name: string;
  client_id: string;
  project_manager_id: string;
  client_spoc_id?: string | null;
  project_start_date: string;
  project_end_date?: string | null;
  project_description?: string | null;
  budget_hours?: number | null;
}

export type ProjectUpdateInput = Partial<Omit<ProjectCreateInput, "client_id">> & {
  status?: string;
};

export async function listProjects(
  params: { client_id?: string; project_manager_id?: string; skip?: number; limit?: number } = {},
): Promise<PaginatedResponse<Project>> {
  const { data } = await apiClient.get<PaginatedResponse<Project>>("/projects", { params });
  return data;
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/projects/${id}`);
  return data;
}

export async function createProject(payload: ProjectCreateInput): Promise<Project> {
  const { data } = await apiClient.post<Project>("/projects", payload);
  return data;
}

export async function updateProject(id: string, payload: ProjectUpdateInput): Promise<Project> {
  const { data } = await apiClient.patch<Project>(`/projects/${id}`, payload);
  return data;
}

export async function deactivateProject(id: string): Promise<Project> {
  const { data } = await apiClient.delete<Project>(`/projects/${id}`);
  return data;
}

export async function reactivateProject(id: string): Promise<Project> {
  return updateProject(id, { status: "Active" });
}
