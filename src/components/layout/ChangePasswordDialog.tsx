import { useState, type FormEvent } from "react";

import { changePassword, extractErrorMessage } from "@/api/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_FORM = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({
        current_password: form.currentPassword,
        new_password: form.newPassword,
      });
      setSuccess(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <>
            <Alert>
              <AlertDescription>Your password has been changed.</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="change-password-current">Current password</Label>
              <Input
                id="change-password-current"
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="change-password-new">New password</Label>
              <Input
                id="change-password-new"
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                required
                minLength={8}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="change-password-confirm">Confirm new password</Label>
              <Input
                id="change-password-confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                required
                minLength={8}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Changing..." : "Change password"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
