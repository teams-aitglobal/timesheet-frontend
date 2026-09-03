import { apiClient } from "./client";
import type { PaginatedResponse } from "./clients";

export interface TaskAssignment {
  task_assignment_id: string;
  project_id: string;
  task_id: string;
  employee_id: string;
  assigned_date: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface TaskAssignmentCreateInput {
  task_id: string;
  employee_id: string;
  assigned_date: string;
}

export async function listTaskAssignments(
  params: { task_id?: string; project_id?: string; employee_id?: string; skip?: number; limit?: number } = {},
): Promise<PaginatedResponse<TaskAssignment>> {
  const { data } = await apiClient.get<PaginatedResponse<TaskAssignment>>("/task-assignments", { params });
  return data;
}

export async function createTaskAssignment(payload: TaskAssignmentCreateInput): Promise<TaskAssignment> {
  const { data } = await apiClient.post<TaskAssignment>("/task-assignments", payload);
  return data;
}

export async function deactivateTaskAssignment(id: string): Promise<TaskAssignment> {
  const { data } = await apiClient.delete<TaskAssignment>(`/task-assignments/${id}`);
  return data;
}
