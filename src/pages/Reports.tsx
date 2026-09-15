import { useState } from "react";
import { Clock, FolderKanban } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { TimesheetReportTab } from "@/components/reports/TimesheetReportTab";
import { ProjectHoursReportTab } from "@/components/reports/ProjectHoursReportTab";

export default function Reports() {
  const { roles } = useAuth();
  const canViewProjectHours = roles.includes("PROJECT_MANAGER") || roles.includes("SUPER_ADMIN");
  const [activeTab, setActiveTab] = useState<"timesheets" | "project-hours">("timesheets");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text">Reports</h1>
          <p className="mt-1 text-sm text-text-secondary">Export timesheet and project data for further analysis.</p>
        </div>

        {canViewProjectHours && (
          <div className="flex overflow-hidden rounded-field border border-border bg-surface">
            <button
              type="button"
              onClick={() => setActiveTab("timesheets")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors",
                activeTab === "timesheets" ? "bg-primary text-primary-foreground" : "text-text hover:bg-bg",
              )}
            >
              <Clock size={15} /> Timesheet Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("project-hours")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors",
                activeTab === "project-hours" ? "bg-primary text-primary-foreground" : "text-text hover:bg-bg",
              )}
            >
              <FolderKanban size={15} /> Project Hours Report
            </button>
          </div>
        )}
      </div>

      {activeTab === "timesheets" || !canViewProjectHours ? <TimesheetReportTab /> : <ProjectHoursReportTab />}
    </div>
  );
}
