import { apiClient } from "./client";
import type { PaginatedResponse } from "./clients";

export interface ProjectAssignment {
  project_assignment_id: string;
  project_id: string;
  employee_id: string;
  allocated_hours: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  remarks: string | null;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ProjectAssignmentCreateInput {
  project_id: string;
  employee_id: string;
  allocated_hours: number;
  start_date: string;
  end_date?: string | null;
  remarks?: string | null;
}

export type ProjectAssignmentUpdateInput = Partial<
  Omit<ProjectAssignmentCreateInput, "project_id" | "employee_id">
> & {
  is_active?: boolean;
};

export async function listProjectAssignments(
  params: { project_id?: string; employee_id?: string; skip?: number; limit?: number } = {},
): Promise<PaginatedResponse<ProjectAssignment>> {
  const { data } = await apiClient.get<PaginatedResponse<ProjectAssignment>>("/project-assignments", { params });
  return data;
}

export async function createProjectAssignment(
  payload: ProjectAssignmentCreateInput,
): Promise<ProjectAssignment> {
  const { data } = await apiClient.post<ProjectAssignment>("/project-assignments", payload);
  return data;
}

export async function updateProjectAssignment(
  id: string,
  payload: ProjectAssignmentUpdateInput,
): Promise<ProjectAssignment> {
  const { data } = await apiClient.patch<ProjectAssignment>(`/project-assignments/${id}`, payload);
  return data;
}

export async function deactivateProjectAssignment(id: string): Promise<ProjectAssignment> {
  const { data } = await apiClient.delete<ProjectAssignment>(`/project-assignments/${id}`);
  return data;
}

export type ProjectStatus = "Active" | "Inactive";

export interface MyProjectAssignment {
  project_assignment_id: string;
  project_id: string;
  project_name: string;
  project_status: ProjectStatus;
  project_start_date: string;
  project_end_date: string | null;
  allocated_hours: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  remarks: string | null;
}

export async function listMyProjectAssignments(): Promise<MyProjectAssignment[]> {
  const { data } = await apiClient.get<MyProjectAssignment[]>("/project-assignments/me");
  return data;
}
