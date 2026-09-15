import { apiClient } from "./client";
import type { PaginatedResponse } from "./clients";
import type { WorkType } from "./timesheets";

export type TimesheetReportStatus = "Draft" | "Submitted" | "Approved" | "Rejected";

export interface TimesheetReportRow {
  timesheet_id: string;
  employee_id: string;
  employee_name: string;
  work_date: string;
  project_id: string;
  project_name: string;
  client_id: string;
  client_name: string;
  work_type: WorkType;
  task_id: string | null;
  task_name: string | null;
  hours: number;
  work_description: string;
  timesheet_status: TimesheetReportStatus;
  submitted_at: string | null;
  approved_at: string | null;
}

export interface TimesheetReportParams {
  project_id?: string;
  client_id?: string;
  employee_id?: string;
  timesheet_status?: TimesheetReportStatus;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}

export async function getTimesheetReport(
  params: TimesheetReportParams = {},
): Promise<PaginatedResponse<TimesheetReportRow>> {
  const { data } = await apiClient.get<PaginatedResponse<TimesheetReportRow>>("/reports/timesheets", {
    params: { ...params, format: "json" },
  });
  return data;
}

export interface ProjectHoursReportRow {
  project_id: string;
  project_name: string;
  client_name: string;
  budget_hours: number | null;
  hours_logged: number;
  remaining_hours: number | null;
}

export async function getProjectHoursReport(
  params: { client_id?: string } = {},
): Promise<ProjectHoursReportRow[]> {
  const { data } = await apiClient.get<ProjectHoursReportRow[]>("/reports/project-hours", {
    params: { ...params, format: "json" },
  });
  return data;
}

async function downloadCsv(url: string, params: Record<string, string | undefined>): Promise<void> {
  const response = await apiClient.get<Blob>(url, {
    params: { ...params, format: "csv" },
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] || "report.csv";

  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export function downloadTimesheetReportCsv(params: TimesheetReportParams = {}): Promise<void> {
  return downloadCsv("/reports/timesheets", params as Record<string, string | undefined>);
}

export function downloadProjectHoursReportCsv(params: { client_id?: string } = {}): Promise<void> {
  return downloadCsv("/reports/project-hours", params as Record<string, string | undefined>);
}
