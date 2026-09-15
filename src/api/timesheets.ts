import { apiClient } from "./client";
import type { PaginatedResponse } from "./clients";

export type TimesheetStatus = "Draft" | "Submitted" | "Approved" | "Rejected";
export type WorkType = "Assigned Task" | "Adhoc" | "Meeting";

export interface Timesheet {
  timesheet_id: string;
  employee_id: string;
  work_date: string;
  project_id: string;
  work_type: WorkType;
  task_id: string | null;
  hours: number;
  work_description: string;
  employee_comment: string | null;
  timesheet_status: TimesheetStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface TimesheetCreateInput {
  work_date: string;
  project_id: string;
  work_type: WorkType;
  task_id?: string | null;
  hours: number;
  work_description: string;
  employee_comment?: string | null;
}

export type TimesheetUpdateInput = Partial<TimesheetCreateInput>;

export interface TimesheetBulkActionResult {
  updated: Timesheet[];
  failed: Record<string, string>;
}

export interface PendingApprovalSummary {
  items: Timesheet[];
  total: number;
  total_hours: number;
  skip: number;
  limit: number;
}

export async function listMyTimesheets(
  params: {
    project_id?: string;
    timesheet_status?: TimesheetStatus;
    date_from?: string;
    date_to?: string;
    skip?: number;
    limit?: number;
  } = {},
): Promise<PaginatedResponse<Timesheet>> {
  const { data } = await apiClient.get<PaginatedResponse<Timesheet>>("/timesheets/my", { params });
  return data;
}

export async function createTimesheet(payload: TimesheetCreateInput): Promise<Timesheet> {
  const { data } = await apiClient.post<Timesheet>("/timesheets", payload);
  return data;
}

export async function updateTimesheet(id: string, payload: TimesheetUpdateInput): Promise<Timesheet> {
  const { data } = await apiClient.patch<Timesheet>(`/timesheets/${id}`, payload);
  return data;
}

export async function deleteTimesheet(id: string): Promise<void> {
  await apiClient.delete(`/timesheets/${id}`);
}

export async function submitTimesheet(id: string): Promise<Timesheet> {
  const { data } = await apiClient.post<Timesheet>(`/timesheets/${id}/submit`);
  return data;
}

export async function submitTimesheetsBulk(timesheetIds: string[]): Promise<TimesheetBulkActionResult> {
  const { data } = await apiClient.post<TimesheetBulkActionResult>("/timesheets/submit-bulk", {
    timesheet_ids: timesheetIds,
  });
  return data;
}

export async function listTimesheets(
  params: {
    employee_id?: string;
    project_id?: string;
    task_id?: string;
    timesheet_status?: TimesheetStatus;
    date_from?: string;
    date_to?: string;
    skip?: number;
    limit?: number;
  } = {},
): Promise<PaginatedResponse<Timesheet>> {
  const { data } = await apiClient.get<PaginatedResponse<Timesheet>>("/timesheets", { params });
  return data;
}

export async function listPendingApproval(
  params: { project_id?: string; skip?: number; limit?: number } = {},
): Promise<PendingApprovalSummary> {
  const { data } = await apiClient.get<PendingApprovalSummary>("/timesheets/pending-approval", { params });
  return data;
}

export async function approveTimesheet(id: string): Promise<Timesheet> {
  const { data } = await apiClient.post<Timesheet>(`/timesheets/${id}/approve`);
  return data;
}

export async function approveTimesheetsBulk(timesheetIds: string[]): Promise<TimesheetBulkActionResult> {
  const { data } = await apiClient.post<TimesheetBulkActionResult>("/timesheets/approve-bulk", {
    timesheet_ids: timesheetIds,
  });
  return data;
}

export async function rejectTimesheet(id: string, rejectionReason: string): Promise<Timesheet> {
  const { data } = await apiClient.post<Timesheet>(`/timesheets/${id}/reject`, {
    rejection_reason: rejectionReason,
  });
  return data;
}
