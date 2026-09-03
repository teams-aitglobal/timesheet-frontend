import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, roles: userRoles, isUserLoading } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles) {
    if (isUserLoading) {
      return null;
    }
    if (!roles.some((role) => userRoles.includes(role))) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
