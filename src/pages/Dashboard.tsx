import { useEffect, useState } from "react";

import { getDashboard, type Dashboard as DashboardData } from "@/api/dashboard";
import { extractErrorMessage } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { formatRole } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    getDashboard()
      .then((result) => {
        if (!cancelled) setData(result);
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

  const subtitle = [user?.designation_id, user?.roles?.map(formatRole).join(", ")].filter(Boolean).join(" · ");

  return (
    <div>
      <div>
        <h1 className="font-serif text-2xl font-bold text-text">
          {user ? `${user.first_name} ${user.last_name}` : "Dashboard"}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {!loadError && isLoading && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent>
                <div className="h-4 w-24 animate-pulse rounded bg-bg" />
                <div className="mt-3 h-6 w-12 animate-pulse rounded bg-bg" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loadError && !isLoading && data && (
        <div className="mt-6">
          {data.role === "EMPLOYEE" && <EmployeeDashboard data={data} />}
          {data.role === "PROGRAM_MANAGER" && <ManagerDashboard data={data} />}
          {data.role === "SUPER_ADMIN" && <AdminDashboard data={data} />}
        </div>
      )}
    </div>
  );
}
