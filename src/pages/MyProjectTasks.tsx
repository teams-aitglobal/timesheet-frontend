import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ListChecks } from "lucide-react";

import { getProject, type Project } from "@/api/projects";
import { listMyTasks, updateMyTaskStatus, type MyTask, type TaskStatus } from "@/api/tasks";
import { extractErrorMessage } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TASK_STATUSES: TaskStatus[] = ["Not Started", "In Progress", "Completed", "On Hold", "Cancelled"];

const selectClassName = cn(
  "flex h-9 w-full min-w-0 rounded-field border border-input bg-surface px-3 py-1.5 text-sm text-text transition-colors outline-none",
  "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/12",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export default function MyProjectTasks() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadProject = async () => {
    if (!projectId) return;
    setIsLoadingProject(true);
    setProjectError(null);
    try {
      setProject(await getProject(projectId));
    } catch (err) {
      setProjectError(extractErrorMessage(err));
    } finally {
      setIsLoadingProject(false);
    }
  };

  const loadTasks = async () => {
    if (!projectId) return;
    setIsLoadingTasks(true);
    setTasksError(null);
    try {
      setTasks(await listMyTasks({ project_id: projectId }));
    } catch (err) {
      setTasksError(extractErrorMessage(err));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadProject();
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleStatusChange = async (task: MyTask, nextStatus: TaskStatus) => {
    if (nextStatus === task.status) return;
    setUpdateError(null);
    setUpdatingTaskId(task.task_id);
    try {
      await updateMyTaskStatus(task.task_id, nextStatus);
      await loadTasks();
    } catch (err) {
      setUpdateError(extractErrorMessage(err));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Back to my projects"
          onClick={() => navigate("/my-projects")}
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <p className="text-sm text-text-secondary">
            <Link to="/my-projects" className="hover:underline">
              My Projects
            </Link>{" "}
            / {project?.project_name ?? "…"}
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-text">
            {isLoadingProject ? "Loading project…" : project?.project_name ?? "Project"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Your tasks on this project.</p>
        </div>
      </div>

      {projectError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{projectError}</AlertDescription>
        </Alert>
      )}
      {tasksError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{tasksError}</AlertDescription>
        </Alert>
      )}
      {updateError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{updateError}</AlertDescription>
        </Alert>
      )}

      {!tasksError && !isLoadingTasks && tasks.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
            <ListChecks size={20} aria-hidden="true" />
          </span>
          <p className="font-medium text-text">No tasks assigned yet</p>
          <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
            You'll see tasks here once you're assigned to one on this project.
          </p>
        </div>
      )}

      {!tasksError && (isLoadingTasks || tasks.length > 0) && (
        <Card className="mt-6 gap-0 py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                  <th className="px-6 py-3.5 font-semibold">Task</th>
                  <th className="px-6 py-3.5 font-semibold">Planned</th>
                  <th className="px-6 py-3.5 font-semibold">Start</th>
                  <th className="px-6 py-3.5 font-semibold">Due</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTasks
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <tr key={index} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4" colSpan={5}>
                          <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                        </td>
                      </tr>
                    ))
                  : tasks.map((task) => (
                      <tr key={task.task_id} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4">
                          <p className="font-medium text-text">{task.task_name}</p>
                          {task.task_description && (
                            <p className="mt-0.5 max-w-sm text-xs text-text-secondary">
                              {task.task_description}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-text-secondary">
                          {task.planned_hours != null ? `${task.planned_hours} hrs` : "—"}
                        </td>
                        <td className="px-6 py-4 text-text-secondary">{task.start_date}</td>
                        <td className="px-6 py-4 text-text-secondary">{task.due_date || "—"}</td>
                        <td className="px-6 py-4">
                          <select
                            className={cn(selectClassName, "max-w-[160px]")}
                            value={task.status}
                            disabled={updatingTaskId === task.task_id}
                            onChange={(event) =>
                              handleStatusChange(task, event.target.value as TaskStatus)
                            }
                            aria-label={`Status for ${task.task_name}`}
                          >
                            {TASK_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
