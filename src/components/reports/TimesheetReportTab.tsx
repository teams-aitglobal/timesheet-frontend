import { useEffect, useState } from "react";
import { Download, FileBarChart } from "lucide-react";

import {
  downloadTimesheetReportCsv,
  getTimesheetReport,
  type TimesheetReportRow,
  type TimesheetReportStatus,
} from "@/api/reports";
import { extractErrorMessage } from "@/api/auth";
import { listClients, type Client } from "@/api/clients";
import { listProjects } from "@/api/projects";
import { listMyProjectAssignments } from "@/api/projectAssignments";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-field border border-input bg-surface px-3 py-1.5 text-sm text-text transition-colors outline-none",
  "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/12",
);

const STATUS_FILTERS: Array<TimesheetReportStatus | "All"> = ["All", "Draft", "Submitted", "Approved", "Rejected"];

const STATUS_BADGE_VARIANT: Record<TimesheetReportStatus, "muted" | "pending" | "active" | "rejected"> = {
  Draft: "muted",
  Submitted: "pending",
  Approved: "active",
  Rejected: "rejected",
};

function formatDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Reports default to the current month so the page never opens on an unbounded, all-time query.
function defaultDateRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  return {
    dateFrom: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo: toIsoDate(now),
  };
}

const DEFAULT_FILTERS = {
  statusFilter: "All" as TimesheetReportStatus | "All",
  clientFilter: "",
  projectFilter: "",
  ...defaultDateRange(),
};

export function TimesheetReportTab() {
  const { roles } = useAuth();
  const canFilterByClientProject = roles.includes("PROJECT_MANAGER") || roles.includes("SUPER_ADMIN");

  // Draft filters reflect the controls on screen; they only take effect once "Apply Filters" is clicked.
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_FILTERS);

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<{ project_id: string; project_name: string }[]>([]);
  const [items, setItems] = useState<TimesheetReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(applied);

  const filterParams = {
    timesheet_status: applied.statusFilter === "All" ? undefined : applied.statusFilter,
    date_from: applied.dateFrom || undefined,
    date_to: applied.dateTo || undefined,
    client_id: canFilterByClientProject ? applied.clientFilter || undefined : undefined,
    project_id: applied.projectFilter || undefined,
  };

  const load = (nextSkip = 0) => {
    setIsLoading(true);
    setLoadError(null);
    getTimesheetReport({ ...filterParams, skip: nextSkip, limit: PAGE_SIZE })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setSkip(res.skip);
      })
      .catch((err) => setLoadError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!canFilterByClientProject) return;
    listClients({ limit: 200 })
      .then((res) => setClients(res.items))
      .catch(() => setClients([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFilterByClientProject]);

  useEffect(() => {
    // PM/Admin pick from the org's projects (optionally scoped by client); employees only ever
    // see the projects they're actually assigned to, via /project-assignments/me.
    if (canFilterByClientProject) {
      listProjects({ client_id: draft.clientFilter || undefined, limit: 200 })
        .then((res) => setProjects(res.items))
        .catch(() => setProjects([]));
    } else {
      listMyProjectAssignments()
        .then((assignments) => {
          const byProject = new Map(assignments.map((a) => [a.project_id, a.project_name]));
          setProjects(Array.from(byProject, ([project_id, project_name]) => ({ project_id, project_name })));
        })
        .catch(() => setProjects([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFilterByClientProject, draft.clientFilter]);

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);

  const hasNextPage = skip + PAGE_SIZE < total;
  const hasPrevPage = skip > 0;

  const applyFilters = () => setApplied(draft);

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
  };

  const exportCsv = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      await downloadTimesheetReportCsv(filterParams);
    } catch (err) {
      setExportError(extractErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          {canFilterByClientProject && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">Client</p>
              <select
                className={cn(selectClassName, "min-w-[160px]")}
                value={draft.clientFilter}
                onChange={(e) => setDraft((d) => ({ ...d, clientFilter: e.target.value, projectFilter: "" }))}
              >
                <option value="">All clients</option>
                {clients.map((c) => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.client_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">Project</p>
            <select
              className={cn(selectClassName, "min-w-[160px]")}
              value={draft.projectFilter}
              onChange={(e) => setDraft((d) => ({ ...d, projectFilter: e.target.value }))}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">Status</p>
            <select
              className={cn(selectClassName, "min-w-[140px]")}
              value={draft.statusFilter}
              onChange={(e) =>
                setDraft((d) => ({ ...d, statusFilter: e.target.value as TimesheetReportStatus | "All" }))
              }
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">From</p>
            <input
              type="date"
              className={cn(selectClassName, "min-w-[150px]")}
              value={draft.dateFrom}
              max={draft.dateTo || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">To</p>
            <input
              type="date"
              className={cn(selectClassName, "min-w-[150px]")}
              value={draft.dateTo}
              min={draft.dateFrom || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
            />
          </div>
          <Button type="button" onClick={applyFilters} disabled={!isDirty}>
            Apply Filters
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            disabled={JSON.stringify(applied) === JSON.stringify(DEFAULT_FILTERS) && !isDirty}
          >
            Reset
          </Button>
        </div>
        <Button type="button" variant="outline" onClick={exportCsv} disabled={isExporting || total === 0}>
          <Download size={16} />
          {isExporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {exportError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}

      {!loadError && !isLoading && items.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
            <FileBarChart size={20} aria-hidden="true" />
          </span>
          <p className="font-medium text-text">No entries match these filters</p>
        </div>
      )}

      {!loadError && (isLoading || items.length > 0) && (
        <Card className="mt-6 gap-0 py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-[1020px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                  <th className="px-6 py-3.5 font-semibold">Employee</th>
                  <th className="px-2 py-3.5 font-semibold">Date</th>
                  <th className="px-2 py-3.5 font-semibold">Client</th>
                  <th className="px-2 py-3.5 font-semibold">Project</th>
                  <th className="px-2 py-3.5 font-semibold">Task</th>
                  <th className="px-2 py-3.5 font-semibold">Hours</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4" colSpan={7}>
                          <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                        </td>
                      </tr>
                    ))
                  : items.map((row) => (
                      <tr key={row.timesheet_id} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4 font-medium text-text">{row.employee_name}</td>
                        <td className="px-2 py-4 text-text-secondary">{formatDate(row.work_date)}</td>
                        <td className="px-2 py-4 text-text-secondary">{row.client_name}</td>
                        <td className="px-2 py-4 text-text-secondary">{row.project_name}</td>
                        <td className="px-2 py-4 text-text-secondary">{row.task_name || row.work_type}</td>
                        <td className="px-2 py-4 text-text-secondary">{row.hours}</td>
                        <td className="px-6 py-4">
                          <Badge variant={STATUS_BADGE_VARIANT[row.timesheet_status]}>
                            {row.timesheet_status.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </CardContent>

          {!isLoading && total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-6 py-3.5 text-sm text-text-secondary">
              <span>
                Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasPrevPage}
                  onClick={() => load(Math.max(skip - PAGE_SIZE, 0))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasNextPage}
                  onClick={() => load(skip + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
