import { Fragment, useEffect, useMemo, useState } from "react";
import { Clock, ListChecks, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

import { listMyProjectAssignments, type MyProjectAssignment } from "@/api/projectAssignments";
import { listMyTasks, type MyTask } from "@/api/tasks";
import {
  createTimesheet,
  deleteTimesheet,
  listMyTimesheets,
  submitTimesheet,
  submitTimesheetsBulk,
  updateTimesheet,
  type Timesheet,
  type TimesheetStatus,
  type WorkType,
} from "@/api/timesheets";
import { extractErrorMessage } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-field border border-input bg-surface px-3 py-1.5 text-sm text-text transition-colors outline-none",
  "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/12",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const inputClassName = cn(
  "flex h-9 w-full min-w-0 rounded-field border border-input bg-surface px-3 py-1.5 text-sm text-text transition-colors outline-none",
  "placeholder:text-[#a7ada6]",
  "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/12",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const STATUS_BADGE_VARIANT: Record<TimesheetStatus, "muted" | "pending" | "active" | "rejected"> = {
  Draft: "muted",
  Submitted: "pending",
  Approved: "active",
  Rejected: "rejected",
};

const STATUS_FILTERS: Array<TimesheetStatus | "All"> = ["All", "Draft", "Submitted", "Approved", "Rejected"];

const WORK_TYPES: WorkType[] = ["Assigned Task", "Adhoc", "Meeting"];

interface ProjectOption {
  project_id: string;
  project_name: string;
}

interface DraftRow {
  key: string;
  projectId: string;
  workType: WorkType | "";
  taskId: string;
  hours: string;
  description: string;
}

function todayISO(): string {
  return toISODate(new Date());
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDaysISO(s: string, delta: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

function formatDateLabel(s: string): string {
  return parseISODate(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function startOfWeekISO(s: string): string {
  const d = parseISODate(s);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

function weekRangeLabel(mondayISO: string): string {
  const start = parseISODate(mondayISO);
  const end = parseISODate(addDaysISO(mondayISO, 6));
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel =
    start.getMonth() === end.getMonth()
      ? end.toLocaleDateString("en-US", { day: "numeric" })
      : end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Week of ${startLabel} – ${endLabel}`;
}

function newRow(): DraftRow {
  return {
    key: Math.random().toString(36).slice(2),
    projectId: "",
    workType: "",
    taskId: "",
    hours: "",
    description: "",
  };
}

function workTypeLabel(t: Timesheet, taskNameById: Map<string, string>): string {
  if (t.work_type === "Assigned Task") {
    return (t.task_id && taskNameById.get(t.task_id)) || "Task";
  }
  return t.work_type;
}

export default function TimesheetPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"log" | "my">("log");

  const [assignments, setAssignments] = useState<MyProjectAssignment[]>([]);
  const [allTasks, setAllTasks] = useState<MyTask[]>([]);
  const [isLoadingRefs, setIsLoadingRefs] = useState(true);
  const [refsError, setRefsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingRefs(true);
    setRefsError(null);
    Promise.all([listMyProjectAssignments(), listMyTasks()])
      .then(([assignmentsRes, tasksRes]) => {
        if (cancelled) return;
        setAssignments(assignmentsRes);
        setAllTasks(tasksRes);
      })
      .catch((err) => {
        if (!cancelled) setRefsError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRefs(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const projectOptions = useMemo<ProjectOption[]>(() => {
    const seen = new Map<string, ProjectOption>();
    for (const a of assignments) {
      if (!seen.has(a.project_id)) {
        seen.set(a.project_id, { project_id: a.project_id, project_name: a.project_name });
      }
    }
    return Array.from(seen.values());
  }, [assignments]);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projectOptions) map.set(p.project_id, p.project_name);
    return map;
  }, [projectOptions]);

  const taskNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of allTasks) map.set(t.task_id, t.task_name);
    return map;
  }, [allTasks]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-label">Timesheet</p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-text">
            {user ? `${user.first_name} ${user.last_name}` : "…"}
          </h1>
        </div>
        <div className="flex overflow-hidden rounded-field border border-border bg-surface">
          <button
            type="button"
            onClick={() => setActiveTab("log")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors",
              activeTab === "log" ? "bg-primary text-primary-foreground" : "text-text hover:bg-bg",
            )}
          >
            <Clock size={15} /> Log Time
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors",
              activeTab === "my" ? "bg-primary text-primary-foreground" : "text-text hover:bg-bg",
            )}
          >
            <ListChecks size={15} /> My Timesheets
          </button>
        </div>
      </div>

      {refsError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{refsError}</AlertDescription>
        </Alert>
      )}

      {!refsError && !isLoadingRefs && projectOptions.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
            <Clock size={20} aria-hidden="true" />
          </span>
          <p className="font-medium text-text">No project assignments yet</p>
          <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
            You'll be able to log time once you're assigned to a project.
          </p>
        </div>
      )}

      {!refsError && (isLoadingRefs || projectOptions.length > 0) ? (
        activeTab === "log" ? (
          <LogTimePanel
            projectOptions={projectOptions}
            allTasks={allTasks}
            isLoadingRefs={isLoadingRefs}
          />
        ) : (
          <MyTimesheetsPanel
            projectOptions={projectOptions}
            projectNameById={projectNameById}
            taskNameById={taskNameById}
          />
        )
      ) : null}
    </div>
  );
}

function LogTimePanel({
  projectOptions,
  allTasks,
  isLoadingRefs,
}: {
  projectOptions: ProjectOption[];
  allTasks: MyTask[];
  isLoadingRefs: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [rows, setRows] = useState<DraftRow[]>([newRow()]);
  const [dayEntries, setDayEntries] = useState<Timesheet[]>([]);
  const [isLoadingDay, setIsLoadingDay] = useState(true);
  const [dayError, setDayError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadDay = () => {
    setIsLoadingDay(true);
    setDayError(null);
    listMyTimesheets({ date_from: selectedDate, date_to: selectedDate, limit: 200 })
      .then((res) => setDayEntries(res.items))
      .catch((err) => setDayError(extractErrorMessage(err)))
      .finally(() => setIsLoadingDay(false));
  };

  useEffect(() => {
    loadDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const loggedHours = dayEntries
    .filter((t) => t.timesheet_status !== "Rejected")
    .reduce((sum, t) => sum + t.hours, 0);
  const draftHours = rows.reduce((sum, r) => sum + (Number.parseFloat(r.hours) || 0), 0);
  const totalHours = loggedHours + draftHours;

  const updateRow = (key: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  };

  const isToday = selectedDate >= todayISO();

  const handleSave = async () => {
    setSaveError(null);
    setSaveNotice(null);

    const activeRows = rows.filter(
      (r) => r.projectId || r.workType || r.taskId || r.hours.trim() || r.description.trim(),
    );
    if (activeRows.length === 0) {
      setSaveError("Add at least one entry before saving.");
      return;
    }

    for (const r of activeRows) {
      if (!r.projectId) {
        setSaveError("Select a project for every entry.");
        return;
      }
      if (!r.workType) {
        setSaveError("Select a work type for every entry.");
        return;
      }
      if (r.workType === "Assigned Task" && !r.taskId) {
        setSaveError("Select a task for every Assigned Task entry.");
        return;
      }
      const hoursNum = Number.parseFloat(r.hours);
      if (!r.hours.trim() || Number.isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
        setSaveError("Enter valid hours (greater than 0, up to 24) for every entry.");
        return;
      }
      if (!r.description.trim()) {
        setSaveError("Add a description for every entry.");
        return;
      }
    }

    setIsSaving(true);
    const failures: string[] = [];
    const succeededKeys: string[] = [];

    for (const r of activeRows) {
      const workType = r.workType as WorkType;
      try {
        await createTimesheet({
          work_date: selectedDate,
          project_id: r.projectId,
          work_type: workType,
          task_id: workType === "Assigned Task" ? r.taskId : null,
          hours: Number.parseFloat(r.hours),
          work_description: r.description.trim(),
        });
        succeededKeys.push(r.key);
      } catch (err) {
        failures.push(extractErrorMessage(err));
      }
    }

    setRows((prev) => {
      const remaining = prev.filter((r) => !succeededKeys.includes(r.key));
      return remaining.length > 0 ? remaining : [newRow()];
    });

    if (failures.length > 0) {
      setSaveError(failures.join(" "));
    } else {
      setSaveNotice("Timesheet saved.");
    }
    setIsSaving(false);
    loadDay();
  };

  return (
    <div>
      <Card className="mt-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous day"
              onClick={() => setSelectedDate((d) => addDaysISO(d, -1))}
            >
              <ChevronLeft size={16} />
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-label">Logging time for</p>
              <p className="font-serif text-lg font-bold text-text">{formatDateLabel(selectedDate)}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next day"
              disabled={isToday}
              onClick={() => setSelectedDate((d) => addDaysISO(d, 1))}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <Clock size={16} className="text-label" />
            {isLoadingDay ? "…" : `${totalHours.toFixed(1)}/8h`}
          </div>
        </CardContent>
      </Card>

      {dayError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{dayError}</AlertDescription>
        </Alert>
      )}

      <Card className="mt-4">
        <CardContent className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-label">Draft entries</p>

          <div className="mt-3 hidden gap-3 px-1 text-xs font-semibold uppercase tracking-[0.04em] text-label sm:grid sm:grid-cols-[1.2fr_1fr_1.2fr_0.6fr_1.4fr_auto]">
            <span>Project</span>
            <span>Work type</span>
            <span>Task</span>
            <span>Hours</span>
            <span>Description</span>
            <span />
          </div>

          <div className="mt-2 flex flex-col gap-2">
            {rows.map((row) => {
              const tasksForProject = allTasks.filter((t) => t.project_id === row.projectId);
              const isAssignedTask = row.workType === "Assigned Task";
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-1 items-center gap-2 rounded-field border border-border p-2 sm:grid-cols-[1.2fr_1fr_1.2fr_0.6fr_1.4fr_auto] sm:border-none sm:p-0"
                >
                  <select
                    className={selectClassName}
                    value={row.projectId}
                    disabled={isLoadingRefs}
                    onChange={(e) => updateRow(row.key, { projectId: e.target.value, workType: "", taskId: "" })}
                  >
                    <option value="">Select project…</option>
                    {projectOptions.map((p) => (
                      <option key={p.project_id} value={p.project_id}>
                        {p.project_name}
                      </option>
                    ))}
                  </select>

                  <select
                    className={selectClassName}
                    value={row.workType}
                    disabled={!row.projectId}
                    onChange={(e) =>
                      updateRow(row.key, { workType: e.target.value as WorkType | "", taskId: "" })
                    }
                  >
                    <option value="">Select work type…</option>
                    {WORK_TYPES.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>

                  <select
                    className={selectClassName}
                    value={row.taskId}
                    disabled={!isAssignedTask}
                    onChange={(e) => updateRow(row.key, { taskId: e.target.value })}
                  >
                    <option value="">{isAssignedTask ? "Select task…" : "Not applicable"}</option>
                    {tasksForProject.map((t) => (
                      <option key={t.task_id} value={t.task_id}>
                        {t.task_name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    placeholder="0.0"
                    className={inputClassName}
                    value={row.hours}
                    onChange={(e) => updateRow(row.key, { hours: e.target.value })}
                  />

                  <input
                    type="text"
                    placeholder="What did you work on…"
                    className={inputClassName}
                    value={row.description}
                    onChange={(e) => updateRow(row.key, { description: e.target.value })}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove entry"
                    disabled={rows.length === 1}
                    onClick={() => removeRow(row.key)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setRows((p) => [...p, newRow()])}>
            <Plus size={14} /> Add another entry
          </Button>

          {saveError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}
          {saveNotice && (
            <Alert className="mt-4">
              <AlertDescription>{saveNotice}</AlertDescription>
            </Alert>
          )}

          <div className="mt-4 flex justify-end border-t border-border pt-4">
            <Button type="button" onClick={handleSave} disabled={isSaving || isLoadingRefs}>
              {isSaving ? "Saving…" : "Save timesheet"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MyTimesheetsPanel({
  projectOptions,
  projectNameById,
  taskNameById,
}: {
  projectOptions: ProjectOption[];
  projectNameById: Map<string, string>;
  taskNameById: Map<string, string>;
}) {
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | "All">("All");
  const [projectFilter, setProjectFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);
    listMyTimesheets({
      timesheet_status: statusFilter === "All" ? undefined : statusFilter,
      project_id: projectFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      limit: 200,
    })
      .then((res) => setTimesheets(res.items))
      .catch((err) => setLoadError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, projectFilter, dateFrom, dateTo]);

  const groups = useMemo(() => {
    const map = new Map<string, Timesheet[]>();
    for (const t of timesheets) {
      const weekStart = startOfWeekISO(t.work_date);
      if (!map.has(weekStart)) map.set(weekStart, []);
      map.get(weekStart)!.push(t);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([weekStart, items]) => ({
        weekStart,
        items: items.sort((a, b) => (a.work_date < b.work_date ? 1 : -1)),
        totalHours: items.reduce((sum, t) => sum + t.hours, 0),
      }));
  }, [timesheets]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkSubmit = async () => {
    if (selectedIds.size === 0) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      const result = await submitTimesheetsBulk(Array.from(selectedIds));
      const failedMessages = Object.values(result.failed);
      if (failedMessages.length > 0) setActionError(failedMessages.join(" "));
      setSelectedIds(new Set());
      load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = async (id: string) => {
    setActionError(null);
    try {
      await deleteTimesheet(id);
      load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    }
  };

  const startEdit = (t: Timesheet) => {
    setEditingId(t.timesheet_id);
    setEditHours(String(t.hours));
    setEditDescription(t.work_description);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditHours("");
    setEditDescription("");
  };

  const saveEdit = async (t: Timesheet) => {
    const hoursNum = Number.parseFloat(editHours);
    if (Number.isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      setActionError("Enter valid hours (greater than 0, up to 24).");
      return;
    }
    if (!editDescription.trim()) {
      setActionError("Description is required.");
      return;
    }
    setActionError(null);
    setIsSavingEdit(true);
    try {
      await updateTimesheet(t.timesheet_id, { hours: hoursNum, work_description: editDescription.trim() });
      if (t.timesheet_status === "Rejected") {
        await submitTimesheet(t.timesheet_id);
      }
      cancelEdit();
      load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const submitOne = async (id: string) => {
    setActionError(null);
    try {
      await submitTimesheet(id);
      load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">Status</p>
            <select
              className={cn(selectClassName, "min-w-[140px]")}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TimesheetStatus | "All")}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">Project</p>
            <select
              className={cn(selectClassName, "min-w-[160px]")}
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="">All projects</option>
              {projectOptions.map((p) => (
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
              className={cn(inputClassName, "min-w-[150px]")}
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-label">To</p>
            <input
              type="date"
              className={cn(inputClassName, "min-w-[150px]")}
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        <Button type="button" onClick={handleBulkSubmit} disabled={selectedIds.size === 0 || isSubmitting}>
          {isSubmitting ? "Submitting…" : `Submit for approval${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {actionError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {!loadError && !isLoading && timesheets.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
            <ListChecks size={20} aria-hidden="true" />
          </span>
          <p className="font-medium text-text">No timesheet entries</p>
          <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
            Log time from the Log Time tab and it will show up here.
          </p>
        </div>
      )}

      {isLoading && (
        <Card className="mt-4">
          <CardContent className="px-6 py-5">
            <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
          </CardContent>
        </Card>
      )}

      {!isLoading &&
        groups.map((group) => (
          <Card key={group.weekStart} className="mt-4 gap-0 py-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-3.5">
              <p className="font-serif text-sm font-bold text-text">{weekRangeLabel(group.weekStart)}</p>
              <p className="text-sm font-semibold text-primary">{group.totalHours.toFixed(1)}h</p>
            </div>
            <CardContent className="overflow-x-auto px-0 py-0">
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                    <th className="w-10 px-6 py-3" />
                    <th className="px-2 py-3 font-semibold">Date</th>
                    <th className="px-2 py-3 font-semibold">Project</th>
                    <th className="px-2 py-3 font-semibold">Task</th>
                    <th className="px-2 py-3 font-semibold">Hours</th>
                    <th className="px-2 py-3 font-semibold">Description</th>
                    <th className="px-2 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((t) => {
                    const canSelect = t.timesheet_status === "Draft" || t.timesheet_status === "Rejected";
                    const isEditing = editingId === t.timesheet_id;
                    return (
                      <Fragment key={t.timesheet_id}>
                        <tr className="border-b border-border last:border-b-0">
                          <td className="px-6 py-4">
                            {canSelect && (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(t.timesheet_id)}
                                onChange={() => toggleSelect(t.timesheet_id)}
                                aria-label={`Select entry from ${t.work_date}`}
                              />
                            )}
                          </td>
                          <td className="px-2 py-4 text-text-secondary">{formatDateLabel(t.work_date)}</td>
                          <td className="px-2 py-4 font-medium text-text">
                            {projectNameById.get(t.project_id) || t.project_id}
                          </td>
                          <td className="px-2 py-4 text-text-secondary">{workTypeLabel(t, taskNameById)}</td>
                          <td className="px-2 py-4 text-text-secondary">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={24}
                                step={0.5}
                                className={cn(inputClassName, "w-20")}
                                value={editHours}
                                onChange={(e) => setEditHours(e.target.value)}
                              />
                            ) : (
                              t.hours
                            )}
                          </td>
                          <td className="px-2 py-4 text-text-secondary">
                            {isEditing ? (
                              <input
                                type="text"
                                className={cn(inputClassName, "min-w-[160px]")}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                              />
                            ) : (
                              t.work_description
                            )}
                          </td>
                          <td className="px-2 py-4">
                            <Badge variant={STATUS_BADGE_VARIANT[t.timesheet_status]}>
                              {t.timesheet_status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              {isEditing ? (
                                <>
                                  <Button type="button" size="sm" disabled={isSavingEdit} onClick={() => saveEdit(t)}>
                                    {isSavingEdit
                                      ? "Saving…"
                                      : t.timesheet_status === "Rejected"
                                        ? "Save & resubmit"
                                        : "Save"}
                                  </Button>
                                  <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {t.timesheet_status === "Draft" && (
                                    <>
                                      <Button type="button" size="sm" variant="outline" onClick={() => startEdit(t)}>
                                        Edit
                                      </Button>
                                      <Button type="button" size="sm" onClick={() => submitOne(t.timesheet_id)}>
                                        Submit
                                      </Button>
                                    </>
                                  )}
                                  {t.timesheet_status === "Rejected" && (
                                    <Button type="button" size="sm" onClick={() => startEdit(t)}>
                                      Fix & resubmit
                                    </Button>
                                  )}
                                  {canSelect && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      aria-label="Discard entry"
                                      onClick={() => handleDiscard(t.timesheet_id)}
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {t.timesheet_status === "Rejected" && t.rejection_reason && (
                          <tr key={`${t.timesheet_id}-reason`} className="border-b border-border bg-badge-high-bg/40 last:border-b-0">
                            <td />
                            <td colSpan={7} className="px-2 py-2 text-xs text-badge-high-text">
                              Rejection reason: {t.rejection_reason}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
