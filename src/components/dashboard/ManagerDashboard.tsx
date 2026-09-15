import { useNavigate } from "react-router-dom";
import { ClipboardCheck, FolderKanban, Users } from "lucide-react";

import type { ManagerDashboard as ManagerDashboardData } from "@/api/dashboard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  data: ManagerDashboardData;
}

export function ManagerDashboard({ data }: Props) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="My projects" value={data.my_projects} onClick={() => navigate("/projects")} />
        <StatCard label="Clients" value={data.clients} onClick={() => navigate("/clients")} />
        <StatCard label="Team members" value={data.team_members} icon={Users} />
        <StatCard
          label="Pending approvals"
          value={data.pending_approvals}
          icon={ClipboardCheck}
          onClick={() => navigate("/approvals")}
        />
        <StatCard
          label="Hours awaiting approval"
          value={`${data.hours_awaiting_approval.toFixed(1)}h`}
          onClick={() => navigate("/approvals")}
        />
      </div>

      {data.pending_approvals > 0 && (
        <Alert className="mt-6 flex items-center justify-between gap-4">
          <AlertDescription>
            {data.pending_approvals} submission{data.pending_approvals === 1 ? "" : "s"} waiting on you (
            {data.hours_awaiting_approval.toFixed(1)}h total).
          </AlertDescription>
          <Button type="button" size="sm" onClick={() => navigate("/approvals")}>
            Review now
          </Button>
        </Alert>
      )}

      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.06em] text-label">My projects</p>
      {data.projects.length === 0 ? (
        <div className="mt-3 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-14 text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
            <FolderKanban size={20} aria-hidden="true" />
          </span>
          <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
            Projects you manage will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.projects.map((project) => {
            const pct =
              project.budget_hours && project.budget_hours > 0
                ? Math.min(100, Math.round((project.hours_logged / project.budget_hours) * 100))
                : null;
            return (
              <Card
                key={project.project_id}
                className="cursor-pointer transition-colors hover:border-primary"
                onClick={() => navigate(`/projects/${project.project_id}`)}
              >
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-text">{project.project_name}</p>
                      <p className="text-sm text-text-secondary">{project.client_name}</p>
                    </div>
                    <Badge variant={project.status === "Active" ? "active" : "muted"}>
                      {project.status.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs text-text-secondary">
                    {formatDate(project.project_start_date)} –{" "}
                    {project.project_end_date ? formatDate(project.project_end_date) : "Ongoing"} ·{" "}
                    {project.team_size} team member{project.team_size === 1 ? "" : "s"}
                  </p>

                  {pct !== null ? (
                    <div>
                      <div className="flex items-center justify-between text-xs text-text-secondary">
                        <span>Hours logged</span>
                        <span>
                          {project.hours_logged.toFixed(1)} / {project.budget_hours!.toFixed(0)}h
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary">
                      Hours logged: {project.hours_logged.toFixed(1)}h (no budget set)
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: number | string;
  icon?: typeof Users;
  onClick?: () => void;
}) {
  return (
    <Card className={onClick ? "cursor-pointer transition-colors hover:border-primary" : undefined} onClick={onClick}>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-label">{label}</p>
          <p className="mt-1 font-serif text-2xl font-bold text-text">{value}</p>
        </div>
        {Icon && (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-field bg-bg text-label">
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}
