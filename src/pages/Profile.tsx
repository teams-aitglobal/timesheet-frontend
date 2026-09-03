import { useState, type FormEvent } from "react";
import { KeyRound, Pencil } from "lucide-react";

import { extractErrorMessage, updateMe } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { getInitials, formatRole } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChangePasswordDialog } from "@/components/layout/ChangePasswordDialog";

export default function Profile() {
  const { user, roles, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const startEditing = () => {
    if (!user) return;
    setForm({ firstName: user.first_name, lastName: user.last_name });
    setFormError(null);
    setIsEditing(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      const updated = await updateMe({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
      });
      updateUser(updated);
      setIsEditing(false);
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-text">Profile</h1>
      <p className="mt-1 text-sm text-text-secondary">
        View your account details and manage your password.
      </p>

      <Card className="mt-6 h-fit max-w-[440px]">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {getInitials(user.first_name, user.last_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-text">
                {user.first_name} {user.last_name}
              </p>
              <p className="truncate text-sm text-text-secondary">{user.email}</p>
            </div>
            {!isEditing && (
              <Button type="button" variant="ghost" size="icon" aria-label="Edit details" onClick={startEditing}>
                <Pencil size={16} />
              </Button>
            )}
          </div>

          {isEditing ? (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-first-name">First name</Label>
                <Input
                  id="profile-first-name"
                  value={form.firstName}
                  onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-last-name">Last name</Label>
                <Input
                  id="profile-last-name"
                  value={form.lastName}
                  onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                  required
                />
              </div>

              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          ) : (
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Employee ID</dt>
                <dd className="mt-0.5 text-text-secondary">{user.employee_id}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Email</dt>
                <dd className="mt-0.5 text-text-secondary">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Role</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {roles.map((role) => (
                    <Badge key={role} variant="active">
                      {formatRole(role)}
                    </Badge>
                  ))}
                </dd>
              </div>
            </dl>
          )}

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <p className="text-sm text-text-secondary">Password for signing in to your account.</p>
            <Button type="button" variant="outline" onClick={() => setChangePasswordOpen(true)}>
              <KeyRound size={16} aria-hidden="true" />
              Change password
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
