import { apiClient } from "./client";
import type { PaginatedResponse } from "./clients";

export type TaskStatus = "Not Started" | "In Progress" | "Completed" | "On Hold" | "Cancelled";

export interface Task {
  task_id: string;
  project_id: string;
  task_name: string;
  task_description: string | null;
  planned_hours: number | null;
  start_date: string;
  due_date: string | null;
  status: TaskStatus;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface TaskCreateInput {
  project_id: string;
  task_name: string;
  task_description?: string | null;
  planned_hours?: number | null;
  start_date: string;
  due_date?: string | null;
}

export type TaskUpdateInput = Partial<Omit<TaskCreateInput, "project_id">> & {
  status?: TaskStatus;
};

export async function listTasks(
  params: {
    project_id?: string;
    status?: TaskStatus;
    search?: string;
    skip?: number;
    limit?: number;
  } = {},
): Promise<PaginatedResponse<Task>> {
  const { data } = await apiClient.get<PaginatedResponse<Task>>("/tasks", { params });
  return data;
}

export async function createTask(payload: TaskCreateInput): Promise<Task> {
  const { data } = await apiClient.post<Task>("/tasks", payload);
  return data;
}

export async function updateTask(id: string, payload: TaskUpdateInput): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${id}`, payload);
  return data;
}

export async function cancelTask(id: string): Promise<Task> {
  const { data } = await apiClient.delete<Task>(`/tasks/${id}`);
  return data;
}
