import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban } from "lucide-react";

import { listMyProjectAssignments, type MyProjectAssignment } from "@/api/projectAssignments";
import { extractErrorMessage } from "@/api/auth";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export default function MyProjects() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<MyProjectAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    listMyProjectAssignments()
      .then((data) => {
        if (!cancelled) setAssignments(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div>
        <h1 className="font-serif text-2xl font-bold text-text">My Projects</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Projects you're currently assigned to.
        </p>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {!loadError && !isLoading && assignments.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
            <FolderKanban size={20} aria-hidden="true" />
          </span>
          <p className="font-medium text-text">No project assignments yet</p>
          <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
            You'll see projects here once you're assigned to one.
          </p>
        </div>
      )}

      {!loadError && (isLoading || assignments.length > 0) && (
        <Card className="mt-6 gap-0 py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                  <th className="px-6 py-3.5 font-semibold">Project</th>
                  <th className="px-6 py-3.5 font-semibold">Allocated hours</th>
                  <th className="px-6 py-3.5 font-semibold">Start</th>
                  <th className="px-6 py-3.5 font-semibold">End</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <tr key={index} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4" colSpan={5}>
                          <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                        </td>
                      </tr>
                    ))
                  : assignments.map((assignment) => (
                      <tr
                        key={assignment.project_assignment_id}
                        className="cursor-pointer border-b border-border last:border-b-0 hover:bg-bg"
                        onClick={() => navigate(`/my-projects/${assignment.project_id}`)}
                      >
                        <td className="px-6 py-4 font-medium text-text">{assignment.project_name}</td>
                        <td className="px-6 py-4 text-text-secondary">{assignment.allocated_hours}</td>
                        <td className="px-6 py-4 text-text-secondary">{assignment.start_date}</td>
                        <td className="px-6 py-4 text-text-secondary">{assignment.end_date || "—"}</td>
                        <td className="px-6 py-4">
                          <Badge variant={assignment.is_active ? "active" : "muted"}>
                            {assignment.is_active ? "Active" : "Inactive"}
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
