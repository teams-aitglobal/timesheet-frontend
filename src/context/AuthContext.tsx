import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, login as loginRequest, type LoginRequest, type MeResponse } from "../api/auth";

interface AuthContextValue {
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  user: MeResponse | null;
  roles: string[];
  isUserLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => void;
  updateUser: (user: MeResponse) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem("access_token")),
  );
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(isAuthenticated);

  const login = async (payload: LoginRequest) => {
    const tokens = await loginRequest(payload);
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    setMustChangePassword(tokens.must_change_password);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setIsAuthenticated(false);
    setMustChangePassword(false);
    setUser(null);
    setIsUserLoading(false);
  };

  useEffect(() => {
    const handleSessionExpired = () => {
      setIsAuthenticated(false);
      setMustChangePassword(false);
      setUser(null);
      setIsUserLoading(false);
    };
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(null);
      setIsUserLoading(false);
      return;
    }
    let cancelled = false;
    setIsUserLoading(true);
    getMe()
      .then((me) => {
        if (!cancelled) {
          setUser(me);
        }
      })
      .catch(() => {
        // A failed /me fetch on a 401 is already handled by the response
        // interceptor (session-expired event); nothing else to do here.
      })
      .finally(() => {
        if (!cancelled) {
          setIsUserLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const roles = useMemo(() => user?.roles ?? [], [user]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      mustChangePassword,
      user,
      roles,
      isUserLoading,
      login,
      logout,
      updateUser: setUser,
    }),
    [isAuthenticated, mustChangePassword, user, roles, isUserLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
