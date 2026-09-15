import { useNavigate } from "react-router-dom";
import { ClipboardCheck, FolderKanban, UserCog, Users } from "lucide-react";

import type { AdminDashboard as AdminDashboardData } from "@/api/dashboard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  data: AdminDashboardData;
}

export function AdminDashboard({ data }: Props) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total clients" value={data.total_clients} icon={Users} onClick={() => navigate("/clients")} />
        <StatCard
          label="Active projects"
          value={data.active_projects}
          icon={FolderKanban}
          onClick={() => navigate("/projects")}
        />
        <StatCard
          label="Total employees"
          value={data.total_employees}
          icon={UserCog}
          onClick={() => navigate("/users")}
        />
        <StatCard label="Pending approvals" value={data.pending_approvals} icon={ClipboardCheck} />
        <StatCard label="Hours awaiting approval" value={`${data.hours_awaiting_approval.toFixed(1)}h`} />
      </div>

      {data.pending_approvals > 0 && (
        <Alert className="mt-6 flex items-center justify-between gap-4">
          <AlertDescription>
            {data.pending_approvals} submission{data.pending_approvals === 1 ? "" : "s"} awaiting approval org-wide (
            {data.hours_awaiting_approval.toFixed(1)}h total).
          </AlertDescription>
          <Button type="button" size="sm" onClick={() => navigate("/reports")}>
            View reports
          </Button>
        </Alert>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickLink title="Clients" description="View and manage client accounts." onClick={() => navigate("/clients")} />
        <QuickLink title="Projects" description="View all projects across clients." onClick={() => navigate("/projects")} />
        <QuickLink title="User management" description="Manage employees and roles." onClick={() => navigate("/users")} />
      </div>
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

function QuickLink({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <Card className="cursor-pointer transition-colors hover:border-primary" onClick={onClick}>
      <CardContent>
        <p className="font-medium text-text">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </CardContent>
    </Card>
  );
}
