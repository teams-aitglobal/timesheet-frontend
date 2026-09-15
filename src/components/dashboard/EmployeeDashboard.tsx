import { useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardList, Clock, FolderKanban } from "lucide-react";

import type { EmployeeDashboard as EmployeeDashboardData } from "@/api/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { TASK_BADGE_VARIANT } from "./task-badge";

function formatDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface Props {
  data: EmployeeDashboardData;
}

export function EmployeeDashboard({ data }: Props) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active projects" value={data.active_projects} icon={FolderKanban} />
        <StatCard label="Remaining tasks" value={data.remaining_tasks} icon={ClipboardList} />
        <StatCard label="Draft timesheets" value={data.draft_timesheets} icon={Clock} />
      </div>

      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.06em] text-label">My projects</p>
      {data.projects.length === 0 ? (
        <EmptyState icon={FolderKanban} message="You'll see projects here once you're assigned to one." />
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.projects.map((project) => (
            <Card key={project.project_id}>
              <CardContent className="flex flex-col gap-3">
                <div>
                  <p className="font-medium text-text">{project.project_name}</p>
                  <p className="text-sm text-text-secondary">{project.client_name}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => navigate(`/my-projects/${project.project_id}`)}
                >
                  View project details
                  <ChevronRight size={14} />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.06em] text-label">My tasks</p>
      {data.tasks.length === 0 ? (
        <EmptyState icon={ClipboardList} message="Nothing on your plate right now." />
      ) : (
        <Card className="mt-3 gap-0 py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <tbody>
                {data.tasks.map((task) => (
                  <tr
                    key={task.task_id}
                    className={cn("border-b border-border last:border-b-0")}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-text">{task.task_name}</p>
                      <p className="text-xs text-text-secondary">{task.project_name}</p>
                    </td>
                    <td className="px-2 py-4 text-right text-text-secondary">
                      {task.due_date ? formatDate(task.due_date) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge variant={TASK_BADGE_VARIANT[task.status] ?? "muted"}>
                        {task.status.toUpperCase()}
                      </Badge>
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

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof FolderKanban }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-label">{label}</p>
          <p className="mt-1 font-serif text-2xl font-bold text-text">{value}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-field bg-bg text-label">
          <Icon size={16} aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof FolderKanban; message: string }) {
  return (
    <div className="mt-3 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-14 text-center">
      <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="mt-1 max-w-[320px] text-sm text-text-secondary">{message}</p>
    </div>
  );
}
