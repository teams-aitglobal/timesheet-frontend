import { useState, type SubmitEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Clock } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface LocationState {
  from?: { pathname: string };
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      const state = location.state as LocationState | null;
      const redirectTo = state?.from?.pathname ?? "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-[400px] pt-10">
        <CardHeader>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[7px] bg-primary text-white">
              <Clock size={14} aria-hidden="true" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-label">
              Timesheet
            </span>
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to manage timesheets, approvals, and projects.</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative flex items-center">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="pr-11"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 h-[30px] w-[30px] rounded-lg"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-text-secondary">
            Need access? Contact your project manager.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
