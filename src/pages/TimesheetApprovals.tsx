import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, History } from "lucide-react";

import {
  approveTimesheet,
  approveTimesheetsBulk,
  listPendingApproval,
  listTimesheets,
  rejectTimesheet,
  type Timesheet,
  type TimesheetStatus,
} from "@/api/timesheets";
import { listProjects, type Project } from "@/api/projects";
import { listUsers, type User } from "@/api/users";
import { listTasks, type Task } from "@/api/tasks";
import { extractErrorMessage } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-field border border-input bg-surface px-3 py-1.5 text-sm text-text transition-colors outline-none",
  "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/12",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const STATUS_BADGE_VARIANT: Record<TimesheetStatus, "muted" | "pending" | "active" | "rejected"> = {
  Draft: "muted",
  Submitted: "pending",
  Approved: "active",
  Rejected: "rejected",
};

const HISTORY_STATUS_FILTERS: Array<TimesheetStatus | "All"> = ["All", "Approved", "Rejected", "Submitted"];

function formatDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function workTypeLabel(t: Timesheet, taskNameById: Map<string, string>): string {
  if (t.work_type === "Assigned Task") {
    return (t.task_id && taskNameById.get(t.task_id)) || "Task";
  }
  return t.work_type;
}

export default function TimesheetApprovals() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  const [managedProjects, setManagedProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      listProjects({ project_manager_id: user.employee_id, limit: 200 }),
      listUsers({ limit: 200 }),
      listTasks({ limit: 200 }),
    ])
      .then(([projectsRes, usersRes, tasksRes]) => {
        setManagedProjects(projectsRes.items);
        setEmployees(usersRes.items);
        setTasks(tasksRes.items);
      })
      .catch(() => {
        // Names fall back to raw ids below if this fails.
      });
  }, [user]);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of managedProjects) map.set(p.project_id, p.project_name);
    return map;
  }, [managedProjects]);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employees) map.set(e.employee_id, `${e.first_name} ${e.last_name}`);
    return map;
  }, [employees]);

  const taskNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) map.set(t.task_id, t.task_name);
    return map;
  }, [tasks]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text">Timesheet Approvals</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review submissions from your team and look back at what you've already actioned.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-field border border-border bg-surface">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors",
              activeTab === "pending" ? "bg-primary text-primary-foreground" : "text-text hover:bg-bg",
            )}
          >
            <ClipboardCheck size={15} /> Pending
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors",
              activeTab === "history" ? "bg-primary text-primary-foreground" : "text-text hover:bg-bg",
            )}
          >
            <History size={15} /> History
          </button>
        </div>
      </div>

      {activeTab === "pending" ? (
        <PendingTab
          managedProjects={managedProjects}
          projectNameById={projectNameById}
          employeeNameById={employeeNameById}
          taskNameById={taskNameById}
        />
      ) : (
        <HistoryTab
          managedProjects={managedProjects}
          projectNameById={projectNameById}
          employeeNameById={employeeNameById}
          taskNameById={taskNameById}
        />
      )}
    </div>
  );
}

interface TabProps {
  managedProjects: Project[];
  projectNameById: Map<string, string>;
  employeeNameById: Map<string, string>;
  taskNameById: Map<string, string>;
}

function PendingTab({ managedProjects, projectNameById, employeeNameById, taskNameById }: TabProps) {
  const [projectFilter, setProjectFilter] = useState("");
  const [items, setItems] = useState<Timesheet[]>([]);
  const [total, setTotal] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [skip, setSkip] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<Timesheet | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const load = (nextSkip = 0) => {
    setIsLoading(true);
    setLoadError(null);
    listPendingApproval({ project_id: projectFilter || undefined, skip: nextSkip, limit: PAGE_SIZE })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalHours(res.total_hours);
        setSkip(res.skip);
      })
      .catch((err) => setLoadError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load(0);
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter]);

  const hasNextPage = skip + PAGE_SIZE < total;
  const hasPrevPage = skip > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === items.length ? new Set() : new Set(items.map((t) => t.timesheet_id))));
  };

  const approveOne = async (id: string) => {
    setActionError(null);
    setApprovingId(id);
    try {
      await approveTimesheet(id);
      load(skip);
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setApprovingId(null);
    }
  };

  const approveSelected = async () => {
    if (selectedIds.size === 0) return;
    setActionError(null);
    setIsBulkApproving(true);
    try {
      const result = await approveTimesheetsBulk(Array.from(selectedIds));
      const failedMessages = Object.values(result.failed);
      if (failedMessages.length > 0) setActionError(failedMessages.join(" "));
      setSelectedIds(new Set());
      load(skip);
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setIsBulkApproving(false);
    }
  };

  const openReject = (t: Timesheet) => {
    setRejectTarget(t);
    setRejectReason("");
    setRejectError(null);
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError("A reason is required to reject a timesheet entry.");
      return;
    }
    setIsRejecting(true);
    setRejectError(null);
    try {
      await rejectTimesheet(rejectTarget.timesheet_id, rejectReason.trim());
      setRejectTarget(null);
      load(skip);
    } catch (err) {
      setRejectError(extractErrorMessage(err));
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">Project</p>
          <select
            className={cn(selectClassName, "min-w-[200px]")}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All my projects</option>
            {managedProjects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.project_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!loadError && !isLoading && total > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Card className="flex-1 min-w-[160px]">
            <CardContent className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-label">Awaiting review</p>
              <p className="mt-1 font-serif text-2xl font-bold text-text">{total}</p>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[160px]">
            <CardContent className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-label">Total hours</p>
              <p className="mt-1 font-serif text-2xl font-bold text-text">{totalHours.toFixed(1)}h</p>
            </CardContent>
          </Card>
          <Button
            type="button"
            onClick={approveSelected}
            disabled={selectedIds.size === 0 || isBulkApproving}
          >
            <CheckCircle2 size={16} />
            {isBulkApproving ? "Approving…" : `Approve selected${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
          </Button>
        </div>
      )}

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {actionError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {!loadError && !isLoading && items.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
            <ClipboardCheck size={20} aria-hidden="true" />
          </span>
          <p className="font-medium text-text">Nothing waiting on you</p>
          <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
            Submitted timesheet entries from your projects will show up here for review.
          </p>
        </div>
      )}

      {!loadError && (isLoading || items.length > 0) && (
        <Card className="mt-6 gap-0 py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                  <th className="w-10 px-6 py-3.5">
                    {!isLoading && items.length > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedIds.size === items.length}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    )}
                  </th>
                  <th className="px-2 py-3.5 font-semibold">Employee</th>
                  <th className="px-2 py-3.5 font-semibold">Date</th>
                  <th className="px-2 py-3.5 font-semibold">Project</th>
                  <th className="px-2 py-3.5 font-semibold">Task</th>
                  <th className="px-2 py-3.5 font-semibold">Hours</th>
                  <th className="px-2 py-3.5 font-semibold">Description</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4" colSpan={8}>
                          <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                        </td>
                      </tr>
                    ))
                  : items.map((t) => (
                      <tr key={t.timesheet_id} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(t.timesheet_id)}
                            onChange={() => toggleSelect(t.timesheet_id)}
                            aria-label={`Select entry from ${t.work_date}`}
                          />
                        </td>
                        <td className="px-2 py-4 font-medium text-text">
                          {employeeNameById.get(t.employee_id) || t.employee_id}
                        </td>
                        <td className="px-2 py-4 text-text-secondary">{formatDate(t.work_date)}</td>
                        <td className="px-2 py-4 text-text-secondary">
                          {projectNameById.get(t.project_id) || t.project_id}
                        </td>
                        <td className="px-2 py-4 text-text-secondary">{workTypeLabel(t, taskNameById)}</td>
                        <td className="px-2 py-4 text-text-secondary">{t.hours}</td>
                        <td className="px-2 py-4 text-text-secondary">{t.work_description}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <Button type="button" size="sm" variant="outline" onClick={() => openReject(t)}>
                              Reject
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={approvingId === t.timesheet_id}
                              onClick={() => approveOne(t.timesheet_id)}
                            >
                              {approvingId === t.timesheet_id ? "Approving…" : "Approve"}
                            </Button>
                          </div>
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

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject timesheet entry</DialogTitle>
            <DialogDescription>
              {rejectTarget && (
                <>
                  This entry from{" "}
                  <strong className="text-text">
                    {employeeNameById.get(rejectTarget.employee_id) || rejectTarget.employee_id}
                  </strong>{" "}
                  will be sent back to them for correction. Provide a reason so they know what to fix.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Reason for rejection…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />

          {rejectError && (
            <Alert variant="destructive">
              <AlertDescription>{rejectError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={submitReject} disabled={isRejecting}>
              {isRejecting ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryTab({ managedProjects, projectNameById, employeeNameById, taskNameById }: TabProps) {
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | "All">("Approved");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [items, setItems] = useState<Timesheet[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = (nextSkip = 0) => {
    setIsLoading(true);
    setLoadError(null);
    listTimesheets({
      project_id: projectFilter || undefined,
      timesheet_status: statusFilter === "All" ? undefined : statusFilter,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      skip: nextSkip,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setSkip(res.skip);
      })
      .catch((err) => setLoadError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, statusFilter, dateFrom, dateTo]);

  const hasNextPage = skip + PAGE_SIZE < total;
  const hasPrevPage = skip > 0;

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">Status</p>
          <select
            className={cn(selectClassName, "min-w-[140px]")}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TimesheetStatus | "All")}
          >
            {HISTORY_STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">Project</p>
          <select
            className={cn(selectClassName, "min-w-[200px]")}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All my projects</option>
            {managedProjects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.project_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">From</p>
          <input
            type="date"
            className={cn(selectClassName, "min-w-[150px]")}
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">To</p>
          <input
            type="date"
            className={cn(selectClassName, "min-w-[150px]")}
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {!loadError && !isLoading && items.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
            <History size={20} aria-hidden="true" />
          </span>
          <p className="font-medium text-text">No entries here yet</p>
          <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
            Entries you've approved or rejected will show up here.
          </p>
        </div>
      )}

      {!loadError && (isLoading || items.length > 0) && (
        <Card className="mt-6 gap-0 py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                  <th className="px-6 py-3.5 font-semibold">Employee</th>
                  <th className="px-2 py-3.5 font-semibold">Date</th>
                  <th className="px-2 py-3.5 font-semibold">Project</th>
                  <th className="px-2 py-3.5 font-semibold">Task</th>
                  <th className="px-2 py-3.5 font-semibold">Hours</th>
                  <th className="px-2 py-3.5 font-semibold">Description</th>
                  <th className="px-2 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4" colSpan={8}>
                          <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                        </td>
                      </tr>
                    ))
                  : items.map((t) => (
                      <tr key={t.timesheet_id} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4 font-medium text-text">
                          {employeeNameById.get(t.employee_id) || t.employee_id}
                        </td>
                        <td className="px-2 py-4 text-text-secondary">{formatDate(t.work_date)}</td>
                        <td className="px-2 py-4 text-text-secondary">
                          {projectNameById.get(t.project_id) || t.project_id}
                        </td>
                        <td className="px-2 py-4 text-text-secondary">{workTypeLabel(t, taskNameById)}</td>
                        <td className="px-2 py-4 text-text-secondary">{t.hours}</td>
                        <td className="px-2 py-4 text-text-secondary">{t.work_description}</td>
                        <td className="px-2 py-4">
                          <Badge variant={STATUS_BADGE_VARIANT[t.timesheet_status]}>
                            {t.timesheet_status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-text-secondary">
                          {t.timesheet_status === "Approved" && t.approved_at && (
                            <span>Approved {formatDate(t.approved_at.slice(0, 10))}</span>
                          )}
                          {t.timesheet_status === "Rejected" && t.rejection_reason && (
                            <span>{t.rejection_reason}</span>
                          )}
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
