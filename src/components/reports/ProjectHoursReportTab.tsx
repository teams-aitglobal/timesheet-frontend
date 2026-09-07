import { useEffect, useState } from "react";
import { Download, FolderKanban } from "lucide-react";

import { downloadProjectHoursReportCsv, getProjectHoursReport, type ProjectHoursReportRow } from "@/api/reports";
import { extractErrorMessage } from "@/api/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ProjectHoursReportTab() {
  const [items, setItems] = useState<ProjectHoursReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    getProjectHoursReport()
      .then((res) => {
        if (!cancelled) setItems(res);
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

  const exportCsv = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      await downloadProjectHoursReportCsv();
    } catch (err) {
      setExportError(extractErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="mt-6 flex items-center justify-end">
        <Button type="button" variant="outline" onClick={exportCsv} disabled={isExporting || items.length === 0}>
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
            <FolderKanban size={20} aria-hidden="true" />
          </span>
          <p className="font-medium text-text">No projects to summarize yet</p>
        </div>
      )}

      {!loadError && (isLoading || items.length > 0) && (
        <Card className="mt-6 gap-0 py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                  <th className="px-6 py-3.5 font-semibold">Project</th>
                  <th className="px-2 py-3.5 font-semibold">Client</th>
                  <th className="px-2 py-3.5 font-semibold">Budget hours</th>
                  <th className="px-2 py-3.5 font-semibold">Hours logged</th>
                  <th className="px-6 py-3.5 font-semibold">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4" colSpan={5}>
                          <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                        </td>
                      </tr>
                    ))
                  : items.map((row) => (
                      <tr key={row.project_id} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4 font-medium text-text">{row.project_name}</td>
                        <td className="px-2 py-4 text-text-secondary">{row.client_name}</td>
                        <td className="px-2 py-4 text-text-secondary">
                          {row.budget_hours !== null ? row.budget_hours.toFixed(0) : "—"}
                        </td>
                        <td className="px-2 py-4 text-text-secondary">{row.hours_logged.toFixed(1)}</td>
                        <td className="px-6 py-4 text-text-secondary">
                          {row.remaining_hours !== null ? row.remaining_hours.toFixed(1) : "—"}
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
