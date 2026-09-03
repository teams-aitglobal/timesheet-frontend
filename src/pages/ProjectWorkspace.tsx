import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ListChecks, Pencil, Plus, Users } from "lucide-react";

import { getProject, type Project } from "@/api/projects";
import { getClient, type Client } from "@/api/clients";
import { listUsers, type User } from "@/api/users";
import {
  createProjectAssignment,
  listProjectAssignments,
  updateProjectAssignment,
  type ProjectAssignment,
  type ProjectAssignmentCreateInput,
} from "@/api/projectAssignments";
import {
  createTask,
  listTasks,
  updateTask,
  type Task,
  type TaskCreateInput,
  type TaskStatus,
} from "@/api/tasks";
import {
  createTaskAssignment,
  deactivateTaskAssignment,
  listTaskAssignments,
  type TaskAssignment,
} from "@/api/taskAssignments";
import { extractErrorMessage } from "@/api/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TASK_STATUSES: TaskStatus[] = ["Not Started", "In Progress", "Completed", "On Hold", "Cancelled"];
const OPEN_TASK_STATUSES: TaskStatus[] = ["Not Started", "In Progress", "On Hold"];
const TASKS_PAGE_SIZE = 50;
const TASK_ASSIGNMENTS_FETCH_LIMIT = 200;
const EMPLOYEE_SEARCH_LIMIT = 50;

const selectClassName = cn(
  "flex h-10 w-full min-w-0 rounded-field border border-input bg-surface px-3.5 py-[9px] text-sm text-text transition-colors outline-none",
  "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/12",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

type Tab = "overview" | "team" | "tasks";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "team", label: "Project Team" },
  { id: "tasks", label: "Tasks" },
];

interface AssignFormValues {
  employee_id: string;
  allocated_hours: string;
  start_date: string;
  end_date: string;
  remarks: string;
}

const EMPTY_ASSIGN_FORM: AssignFormValues = {
  employee_id: "",
  allocated_hours: "",
  start_date: "",
  end_date: "",
  remarks: "",
};

interface TaskFormValues {
  task_name: string;
  task_description: string;
  planned_hours: string;
  start_date: string;
  due_date: string;
  status: TaskStatus;
  employee_id: string;
}

const EMPTY_TASK_FORM: TaskFormValues = {
  task_name: "",
  task_description: "",
  planned_hours: "",
  start_date: "",
  due_date: "",
  status: "Not Started",
  employee_id: "",
};

function toTaskFormValues(task: Task, employeeId: string): TaskFormValues {
  return {
    task_name: task.task_name,
    task_description: task.task_description ?? "",
    planned_hours: task.planned_hours != null ? String(task.planned_hours) : "",
    start_date: task.start_date,
    due_date: task.due_date ?? "",
    status: task.status,
    employee_id: employeeId,
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [client, setClient] = useState<Client | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [tasksSkip, setTasksSkip] = useState(0);
  const [taskSearchInput, setTaskSearchInput] = useState("");
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [taskAssignmentsByTask, setTaskAssignmentsByTask] = useState<Record<string, TaskAssignment[]>>({});

  // Overview stats are fetched independently of the (paginated, searchable) task list below,
  // since only `total` from each response is needed rather than every row.
  const [taskStats, setTaskStats] = useState<{ total: number; open: number }>({ total: 0, open: 0 });

  const [employeeSearchInput, setEmployeeSearchInput] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<User[]>([]);
  const [isSearchingEmployees, setIsSearchingEmployees] = useState(false);
  const [taskAssigneeQuery, setTaskAssigneeQuery] = useState("");

  const [assignFormOpen, setAssignFormOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignFormValues>(EMPTY_ASSIGN_FORM);
  const [assignFormError, setAssignFormError] = useState<string | null>(null);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentActionError, setAssignmentActionError] = useState<string | null>(null);
  const [togglingAssignmentId, setTogglingAssignmentId] = useState<string | null>(null);

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);

  const loadProject = async () => {
    if (!projectId) return;
    setIsLoadingProject(true);
    setProjectError(null);
    try {
      const data = await getProject(projectId);
      setProject(data);
      getClient(data.client_id)
        .then(setClient)
        .catch(() => setClient(null));
    } catch (err) {
      setProjectError(extractErrorMessage(err));
    } finally {
      setIsLoadingProject(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await listUsers({ limit: 200 });
      setUsers(data.items);
    } catch {
      // Lookup failures surface as raw ids in the tables below.
    }
  };

  const searchEmployees = async (query: string) => {
    setIsSearchingEmployees(true);
    try {
      const data = await listUsers({ search: query || undefined, limit: EMPLOYEE_SEARCH_LIMIT });
      setEmployeeOptions(data.items);
    } catch {
      setEmployeeOptions([]);
    } finally {
      setIsSearchingEmployees(false);
    }
  };

  // Debounce the employee search box so we're not sending a request on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      searchEmployees(employeeSearchInput.trim());
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeSearchInput]);

  const loadAssignments = async () => {
    if (!projectId) return;
    setIsLoadingAssignments(true);
    setAssignmentsError(null);
    try {
      const data = await listProjectAssignments({ project_id: projectId, limit: 200 });
      setAssignments(data.items);
    } catch (err) {
      setAssignmentsError(extractErrorMessage(err));
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const loadTasks = async (nextSkip = 0, search = taskSearchInput) => {
    if (!projectId) return;
    setIsLoadingTasks(true);
    setTasksError(null);
    try {
      const data = await listTasks({
        project_id: projectId,
        search: search.trim() || undefined,
        skip: nextSkip,
        limit: TASKS_PAGE_SIZE,
      });
      setTasks(data.items);
      setTasksTotal(data.total);
      setTasksSkip(data.skip);
    } catch (err) {
      setTasksError(extractErrorMessage(err));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // One request for every task assignment in the project, instead of one request per task.
  // Loops pages in the rare case a project has more active assignments than fit on one page.
  const loadTaskAssignments = async () => {
    if (!projectId) return;
    try {
      const all: TaskAssignment[] = [];
      let skip = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const data = await listTaskAssignments({
          project_id: projectId,
          skip,
          limit: TASK_ASSIGNMENTS_FETCH_LIMIT,
        });
        all.push(...data.items);
        skip += data.items.length;
        if (skip >= data.total || data.items.length === 0) break;
      }
      const byTask: Record<string, TaskAssignment[]> = {};
      for (const assignment of all) {
        (byTask[assignment.task_id] ??= []).push(assignment);
      }
      setTaskAssignmentsByTask(byTask);
    } catch {
      setTaskAssignmentsByTask({});
    }
  };

  // Overview stat cards need accurate counts across the whole project, not just the
  // current page of the (paginated) task list below, so these are fetched separately.
  const loadTaskStats = async () => {
    if (!projectId) return;
    try {
      const [totalData, ...openData] = await Promise.all([
        listTasks({ project_id: projectId, limit: 1 }),
        ...OPEN_TASK_STATUSES.map((status) => listTasks({ project_id: projectId, status, limit: 1 })),
      ]);
      setTaskStats({
        total: totalData.total,
        open: openData.reduce((sum, page) => sum + page.total, 0),
      });
    } catch {
      setTaskStats({ total: 0, open: 0 });
    }
  };

  useEffect(() => {
    loadProject();
    loadUsers();
    loadAssignments();
    loadTasks(0, "");
    loadTaskAssignments();
    loadTaskStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Debounce the task search box.
  useEffect(() => {
    const handle = setTimeout(() => {
      loadTasks(0, taskSearchInput);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskSearchInput]);

  const employeeName = (employeeId: string) => {
    const user = users.find((u) => u.employee_id === employeeId);
    return user ? `${user.first_name} ${user.last_name}` : employeeId;
  };

  const activeTeam = useMemo(() => assignments.filter((a) => a.is_active), [assignments]);
  const activeAssignedEmployeeIds = useMemo(
    () => new Set(activeTeam.map((a) => a.employee_id)),
    [activeTeam],
  );

  const activeAssigneeForTask = (taskId: string): TaskAssignment | undefined =>
    (taskAssignmentsByTask[taskId] ?? []).find((a) => a.is_active);

  // Filters the already-loaded project team locally, no network call needed.
  const taskAssigneeOptions = useMemo<ComboboxOption[]>(() => {
    const q = taskAssigneeQuery.trim().toLowerCase();
    const options: ComboboxOption[] = [];
    if (!q || "unassigned".includes(q)) {
      options.push({ value: "", label: "Unassigned" });
    }
    for (const a of activeTeam) {
      const label = employeeName(a.employee_id);
      if (!q || label.toLowerCase().includes(q)) {
        options.push({ value: a.employee_id, label });
      }
    }
    return options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam, taskAssigneeQuery, users]);

  const openAssignDialog = () => {
    setAssignForm({ ...EMPTY_ASSIGN_FORM, start_date: todayIso() });
    setAssignFormError(null);
    setEmployeeSearchInput("");
    setAssignFormOpen(true);
  };

  const handleAssignSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId) return;
    if (!assignForm.employee_id) {
      setAssignFormError("Please select an employee.");
      return;
    }
    setAssignFormError(null);
    setIsSavingAssignment(true);
    try {
      const payload: ProjectAssignmentCreateInput = {
        project_id: projectId,
        employee_id: assignForm.employee_id,
        allocated_hours: Number(assignForm.allocated_hours),
        start_date: assignForm.start_date,
        end_date: assignForm.end_date || null,
        remarks: assignForm.remarks.trim() || null,
      };
      await createProjectAssignment(payload);
      setAssignFormOpen(false);
      await loadAssignments();
    } catch (err) {
      setAssignFormError(extractErrorMessage(err));
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleAssignmentToggle = async (assignment: ProjectAssignment, next: boolean) => {
    setAssignmentActionError(null);
    setTogglingAssignmentId(assignment.project_assignment_id);
    try {
      await updateProjectAssignment(assignment.project_assignment_id, { is_active: next });
      await loadAssignments();
    } catch (err) {
      setAssignmentActionError(extractErrorMessage(err));
    } finally {
      setTogglingAssignmentId(null);
    }
  };

  const openCreateTaskDialog = () => {
    setEditingTask(null);
    setTaskForm({ ...EMPTY_TASK_FORM, start_date: todayIso() });
    setTaskFormError(null);
    setTaskAssigneeQuery("");
    setTaskFormOpen(true);
  };

  const openEditTaskDialog = (task: Task) => {
    const assigneeId = activeAssigneeForTask(task.task_id)?.employee_id ?? "";
    setEditingTask(task);
    setTaskForm(toTaskFormValues(task, assigneeId));
    setTaskFormError(null);
    setTaskAssigneeQuery(assigneeId ? employeeName(assigneeId) : "");
    setTaskFormOpen(true);
  };

  const handleTaskSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId) return;
    if (!taskForm.task_name.trim()) {
      setTaskFormError("Please enter a task name.");
      return;
    }
    setTaskFormError(null);
    setIsSavingTask(true);
    try {
      let task: Task;
      if (editingTask) {
        task = await updateTask(editingTask.task_id, {
          task_name: taskForm.task_name.trim(),
          task_description: taskForm.task_description.trim() || null,
          planned_hours: taskForm.planned_hours ? Number(taskForm.planned_hours) : null,
          start_date: taskForm.start_date,
          due_date: taskForm.due_date || null,
          status: taskForm.status,
        });

        const currentAssignment = activeAssigneeForTask(task.task_id);
        if ((currentAssignment?.employee_id ?? "") !== taskForm.employee_id) {
          if (currentAssignment) {
            await deactivateTaskAssignment(currentAssignment.task_assignment_id);
          }
          if (taskForm.employee_id) {
            await createTaskAssignment({
              task_id: task.task_id,
              employee_id: taskForm.employee_id,
              assigned_date: todayIso(),
            });
          }
        }
      } else {
        const payload: TaskCreateInput = {
          project_id: projectId,
          task_name: taskForm.task_name.trim(),
          task_description: taskForm.task_description.trim() || null,
          planned_hours: taskForm.planned_hours ? Number(taskForm.planned_hours) : null,
          start_date: taskForm.start_date,
          due_date: taskForm.due_date || null,
        };
        task = await createTask(payload);
        if (taskForm.employee_id) {
          await createTaskAssignment({
            task_id: task.task_id,
            employee_id: taskForm.employee_id,
            assigned_date: todayIso(),
          });
        }
      }
      setTaskFormOpen(false);
      await Promise.all([loadTasks(tasksSkip, taskSearchInput), loadTaskAssignments(), loadTaskStats()]);
    } catch (err) {
      setTaskFormError(extractErrorMessage(err));
    } finally {
      setIsSavingTask(false);
    }
  };

  const budgetHours = project?.budget_hours ?? null;

  return (
    <div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" aria-label="Back to projects" onClick={() => navigate("/projects")}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <p className="text-sm text-text-secondary">
            <Link to="/projects" className="hover:underline">
              Projects
            </Link>{" "}
            / {project?.project_name ?? "…"}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-text">
              {isLoadingProject ? "Loading project…" : project?.project_name ?? "Project"}
            </h1>
            {project && (
              <Badge variant={project.status === "Active" ? "active" : "muted"}>{project.status}</Badge>
            )}
          </div>
          {project && (
            <p className="mt-1 text-sm text-text-secondary">
              {client?.client_name ?? project.client_id} &nbsp;•&nbsp; {project.project_start_date}
              {project.project_end_date ? ` – ${project.project_end_date}` : ""}
            </p>
          )}
        </div>
      </div>

      {projectError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{projectError}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 inline-flex gap-1 rounded-card border border-border bg-surface p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-field px-4 py-2 text-sm font-semibold transition-colors",
              activeTab === tab.id ? "bg-bg text-text" : "text-text-secondary hover:text-text",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="mt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent>
                <p className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Budget Hours</p>
                <p className="mt-2 text-2xl font-bold text-text">{budgetHours ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Team Members</p>
                <p className="mt-2 text-2xl font-bold text-text">{activeTeam.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Total Tasks</p>
                <p className="mt-2 text-2xl font-bold text-text">{taskStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Open Tasks</p>
                <p className="mt-2 text-2xl font-bold text-text">{taskStats.open}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardContent>
              <h2 className="font-semibold text-text">Project Information</h2>
              <p className="mt-1 text-sm text-text-secondary">Basic information configured for this project.</p>
              <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Client</dt>
                  <dd className="mt-0.5 text-text">{client?.client_name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Project Manager</dt>
                  <dd className="mt-0.5 text-text">
                    {project ? employeeName(project.project_manager_id) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Start Date</dt>
                  <dd className="mt-0.5 text-text">{project?.project_start_date ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">End Date</dt>
                  <dd className="mt-0.5 text-text">{project?.project_end_date ?? "—"}</dd>
                </div>
              </dl>
              {project?.project_description && (
                <div className="mt-5">
                  <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Description</dt>
                  <dd className="mt-0.5 text-sm text-text-secondary">{project.project_description}</dd>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "team" && (
        <div className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-text">Project Team</h2>
              <p className="mt-1 text-sm text-text-secondary">Assign employees who can work on this project.</p>
            </div>
            <Button onClick={openAssignDialog} disabled={!projectId}>
              <Plus size={16} aria-hidden="true" />
              Assign Employee
            </Button>
          </div>

          {assignmentsError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{assignmentsError}</AlertDescription>
            </Alert>
          )}
          {assignmentActionError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{assignmentActionError}</AlertDescription>
            </Alert>
          )}

          {!assignmentsError && !isLoadingAssignments && assignments.length === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-16 text-center">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
                <Users size={20} aria-hidden="true" />
              </span>
              <p className="font-medium text-text">No team members yet</p>
              <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
                Assign an employee to start tracking work on this project.
              </p>
              <Button className="mt-5" onClick={openAssignDialog}>
                <Plus size={16} aria-hidden="true" />
                Assign Employee
              </Button>
            </div>
          )}

          {!assignmentsError && (isLoadingAssignments || assignments.length > 0) && (
            <Card className="mt-4 gap-0 py-0">
              <CardContent className="overflow-x-auto px-0">
                <table className="w-full min-w-[820px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                      <th className="px-6 py-3.5 font-semibold">Employee</th>
                      <th className="px-6 py-3.5 font-semibold">Allocated Hours</th>
                      <th className="px-6 py-3.5 font-semibold">Start Date</th>
                      <th className="px-6 py-3.5 font-semibold">End Date</th>
                      <th className="px-6 py-3.5 font-semibold">Remarks</th>
                      <th className="px-6 py-3.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingAssignments
                      ? Array.from({ length: 3 }).map((_, index) => (
                          <tr key={index} className="border-b border-border last:border-b-0">
                            <td className="px-6 py-4" colSpan={6}>
                              <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                            </td>
                          </tr>
                        ))
                      : assignments.map((assignment) => (
                          <tr key={assignment.project_assignment_id} className="border-b border-border last:border-b-0">
                            <td className="px-6 py-4 font-medium text-text">
                              {employeeName(assignment.employee_id)}
                            </td>
                            <td className="px-6 py-4 text-text-secondary">{assignment.allocated_hours} hrs</td>
                            <td className="px-6 py-4 text-text-secondary">{assignment.start_date}</td>
                            <td className="px-6 py-4 text-text-secondary">{assignment.end_date || "—"}</td>
                            <td className="px-6 py-4 text-text-secondary">{assignment.remarks || "—"}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={assignment.is_active}
                                  disabled={togglingAssignmentId === assignment.project_assignment_id}
                                  onCheckedChange={(next) => handleAssignmentToggle(assignment, next)}
                                  aria-label={`Toggle status for ${employeeName(assignment.employee_id)}`}
                                />
                                <span
                                  className={
                                    assignment.is_active
                                      ? "text-sm font-medium text-badge-active-text"
                                      : "text-sm text-text-secondary"
                                  }
                                >
                                  {assignment.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-text">Project Tasks</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Create tasks under this project and assign them to project team members.
              </p>
            </div>
            <Button onClick={openCreateTaskDialog} disabled={!projectId}>
              <Plus size={16} aria-hidden="true" />
              Create Task
            </Button>
          </div>

          <Input
            className="mt-4 max-w-xs"
            placeholder="Search tasks by name…"
            value={taskSearchInput}
            onChange={(event) => setTaskSearchInput(event.target.value)}
            aria-label="Search tasks"
          />

          {tasksError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{tasksError}</AlertDescription>
            </Alert>
          )}

          {!tasksError && !isLoadingTasks && tasks.length === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-16 text-center">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
                <ListChecks size={20} aria-hidden="true" />
              </span>
              <p className="font-medium text-text">
                {taskSearchInput.trim() ? "No matching tasks" : "No tasks yet"}
              </p>
              <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
                {taskSearchInput.trim()
                  ? "Try a different search term."
                  : "Create a task and optionally assign it to a team member."}
              </p>
              {!taskSearchInput.trim() && (
                <Button className="mt-5" onClick={openCreateTaskDialog}>
                  <Plus size={16} aria-hidden="true" />
                  Create Task
                </Button>
              )}
            </div>
          )}

          {!tasksError && (isLoadingTasks || tasks.length > 0) && (
            <Card className="mt-4 gap-0 py-0">
              <CardContent className="overflow-x-auto px-0">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                      <th className="px-6 py-3.5 font-semibold">Task</th>
                      <th className="px-6 py-3.5 font-semibold">Assigned To</th>
                      <th className="px-6 py-3.5 font-semibold">Planned</th>
                      <th className="px-6 py-3.5 font-semibold">Start</th>
                      <th className="px-6 py-3.5 font-semibold">Due</th>
                      <th className="px-6 py-3.5 font-semibold">Status</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingTasks
                      ? Array.from({ length: 3 }).map((_, index) => (
                          <tr key={index} className="border-b border-border last:border-b-0">
                            <td className="px-6 py-4" colSpan={7}>
                              <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                            </td>
                          </tr>
                        ))
                      : tasks.map((task) => {
                          const assignee = activeAssigneeForTask(task.task_id);
                          return (
                            <tr key={task.task_id} className="border-b border-border last:border-b-0">
                              <td className="px-6 py-4 font-medium text-text">{task.task_name}</td>
                              <td className="px-6 py-4 text-text-secondary">
                                {assignee ? employeeName(assignee.employee_id) : "Unassigned"}
                              </td>
                              <td className="px-6 py-4 text-text-secondary">
                                {task.planned_hours != null ? `${task.planned_hours} hrs` : "—"}
                              </td>
                              <td className="px-6 py-4 text-text-secondary">{task.start_date}</td>
                              <td className="px-6 py-4 text-text-secondary">{task.due_date || "—"}</td>
                              <td className="px-6 py-4">
                                <Badge variant={task.status === "Completed" || task.status === "In Progress" ? "active" : "muted"}>
                                  {task.status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Edit ${task.task_name}`}
                                    onClick={() => openEditTaskDialog(task)}
                                  >
                                    <Pencil size={16} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </CardContent>

              {!isLoadingTasks && tasksTotal > TASKS_PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-border px-6 py-3.5 text-sm text-text-secondary">
                  <span>
                    Showing {tasksSkip + 1}–{Math.min(tasksSkip + TASKS_PAGE_SIZE, tasksTotal)} of {tasksTotal}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={tasksSkip === 0}
                      onClick={() => loadTasks(Math.max(tasksSkip - TASKS_PAGE_SIZE, 0), taskSearchInput)}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={tasksSkip + TASKS_PAGE_SIZE >= tasksTotal}
                      onClick={() => loadTasks(tasksSkip + TASKS_PAGE_SIZE, taskSearchInput)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      <Dialog open={assignFormOpen} onOpenChange={setAssignFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign employee</DialogTitle>
            <DialogDescription>Assign an employee to this project with an hours allocation.</DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleAssignSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assign-employee">Employee</Label>
              <Combobox
                id="assign-employee"
                query={employeeSearchInput}
                onQueryChange={setEmployeeSearchInput}
                isLoading={isSearchingEmployees}
                options={employeeOptions
                  .filter((u) => !activeAssignedEmployeeIds.has(u.employee_id))
                  .map((u) => ({
                    value: u.employee_id,
                    label: `${u.first_name} ${u.last_name}`,
                    description: u.email,
                  }))}
                onSelect={(option) => {
                  setAssignForm((prev) => ({ ...prev, employee_id: option.value }));
                  setEmployeeSearchInput(option.label);
                }}
                placeholder="Search employees by name or email…"
                emptyMessage="No matching employees"
                aria-invalid={Boolean(assignFormError)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assign-hours">Allocated hours</Label>
              <Input
                id="assign-hours"
                type="number"
                min="0.5"
                step="0.5"
                value={assignForm.allocated_hours}
                onChange={(event) => setAssignForm((prev) => ({ ...prev, allocated_hours: event.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assign-start">Start date</Label>
                <Input
                  id="assign-start"
                  type="date"
                  value={assignForm.start_date}
                  onChange={(event) => setAssignForm((prev) => ({ ...prev, start_date: event.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assign-end">End date</Label>
                <Input
                  id="assign-end"
                  type="date"
                  value={assignForm.end_date}
                  onChange={(event) => setAssignForm((prev) => ({ ...prev, end_date: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assign-remarks">Remarks</Label>
              <Textarea
                id="assign-remarks"
                value={assignForm.remarks}
                onChange={(event) => setAssignForm((prev) => ({ ...prev, remarks: event.target.value }))}
              />
            </div>

            {assignFormError && (
              <Alert variant="destructive">
                <AlertDescription>{assignFormError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingAssignment}>
                {isSavingAssignment ? "Saving..." : "Assign to project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={taskFormOpen} onOpenChange={setTaskFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit task" : "Create task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update this task's details." : "Create a task under this project."}
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleTaskSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-name">Task name</Label>
              <Input
                id="task-name"
                value={taskForm.task_name}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, task_name: event.target.value }))}
                aria-invalid={Boolean(taskFormError)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={taskForm.task_description}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, task_description: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-hours">Planned hours</Label>
                <Input
                  id="task-hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={taskForm.planned_hours}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, planned_hours: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-status">Status</Label>
                <select
                  id="task-status"
                  className={selectClassName}
                  value={taskForm.status}
                  onChange={(event) =>
                    setTaskForm((prev) => ({ ...prev, status: event.target.value as TaskStatus }))
                  }
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-start">Start date</Label>
                <Input
                  id="task-start"
                  type="date"
                  value={taskForm.start_date}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, start_date: event.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-due">Due date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, due_date: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-employee">Assign to</Label>
              <Combobox
                id="task-employee"
                query={taskAssigneeQuery}
                onQueryChange={setTaskAssigneeQuery}
                options={taskAssigneeOptions}
                onSelect={(option) => {
                  setTaskForm((prev) => ({ ...prev, employee_id: option.value }));
                  setTaskAssigneeQuery(option.value ? option.label : "");
                }}
                placeholder="Search project team members…"
                emptyMessage="No matching team members"
                disabled={activeTeam.length === 0}
              />
              {activeTeam.length === 0 && (
                <p className="text-xs text-text-secondary">
                  Assign employees to the project team first to enable task assignment.
                </p>
              )}
            </div>

            {taskFormError && (
              <Alert variant="destructive">
                <AlertDescription>{taskFormError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaskFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingTask}>
                {isSavingTask ? "Saving..." : editingTask ? "Save changes" : "Create & Assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
