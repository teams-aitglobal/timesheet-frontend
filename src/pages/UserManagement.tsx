import { useEffect, useState, type SubmitEvent } from "react";
import { KeyRound, Pencil, Plus, Power, RotateCcw, ShieldCheck, UserCog } from "lucide-react";

import {
  assignRoles,
  createUser,
  deactivateUser,
  listRoles,
  listUsers,
  removeRole,
  resetPassword,
  updateUser,
  type PasswordResetResponse,
  type Role,
  type User,
  type UserCreateInput,
  type UserCreateResponse,
} from "@/api/users";
import { extractErrorMessage } from "@/api/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

const PAGE_SIZE = 20;

interface EmployeeForm {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  designation_id: string;
  date_of_joining: string;
  description: string;
  role_ids: string[];
}

const EMPTY_FORM: EmployeeForm = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  designation_id: "",
  date_of_joining: "",
  description: "",
  role_ids: [],
};

function toFormValues(user: User, roles: Role[]): EmployeeForm {
  const roleIds = roles.filter((role) => user.roles.includes(role.name)).map((role) => role.id);
  return {
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone ?? "",
    designation_id: user.designation_id ?? "",
    date_of_joining: user.date_of_joining ?? "",
    description: user.description ?? "",
    role_ids: roleIds,
  };
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [credentials, setCredentials] = useState<UserCreateResponse | null>(null);

  const [rolesTarget, setRolesTarget] = useState<User | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  const [statusTarget, setStatusTarget] = useState<User | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<PasswordResetResponse | null>(null);

  const loadUsers = async (nextSkip: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listUsers({ skip: nextSkip, limit: PAGE_SIZE });
      setUsers(data.items);
      setTotal(data.total);
      setSkip(data.skip);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(0);
    listRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  const openCreateDialog = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setForm(toFormValues(user, roles));
    setFormError(null);
    setFormOpen(true);
  };

  const toggleFormRole = (roleId: string) => {
    setForm((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  };

  const handleFormSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!editingUser && form.role_ids.length === 0) {
      setFormError("Select at least one role.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.employee_id, {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || null,
          designation_id: form.designation_id.trim() || null,
          date_of_joining: form.date_of_joining || null,
          description: form.description.trim() || null,
        });
        setFormOpen(false);
        await loadUsers(skip);
      } else {
        const payload: UserCreateInput = {
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || null,
          designation_id: form.designation_id.trim() || null,
          date_of_joining: form.date_of_joining || null,
          description: form.description.trim() || null,
          role_ids: form.role_ids,
        };
        const created = await createUser(payload);
        setFormOpen(false);
        setCredentials(created);
        await loadUsers(0);
      }
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const openRolesDialog = (user: User) => {
    setRolesTarget(user);
    setSelectedRoleIds(roles.filter((role) => user.roles.includes(role.name)).map((role) => role.id));
    setRolesError(null);
  };

  const toggleSelectedRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const handleSaveRoles = async () => {
    if (!rolesTarget) return;
    setRolesError(null);

    const currentRoleIds = roles
      .filter((role) => rolesTarget.roles.includes(role.name))
      .map((role) => role.id);
    const toAdd = selectedRoleIds.filter((id) => !currentRoleIds.includes(id));
    const toRemove = currentRoleIds.filter((id) => !selectedRoleIds.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      setRolesTarget(null);
      return;
    }

    setIsSavingRoles(true);
    try {
      if (toAdd.length > 0) {
        await assignRoles(rolesTarget.employee_id, toAdd);
      }
      for (const roleId of toRemove) {
        await removeRole(rolesTarget.employee_id, roleId);
      }
      setRolesTarget(null);
      await loadUsers(skip);
    } catch (err) {
      setRolesError(extractErrorMessage(err));
    } finally {
      setIsSavingRoles(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!statusTarget) return;
    setStatusError(null);
    setIsChangingStatus(true);
    try {
      if (statusTarget.status === "Active") {
        await deactivateUser(statusTarget.employee_id);
      } else {
        await updateUser(statusTarget.employee_id, { status: "Active" });
      }
      setStatusTarget(null);
      await loadUsers(skip);
    } catch (err) {
      setStatusError(extractErrorMessage(err));
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetError(null);
    setIsResetting(true);
    try {
      const result = await resetPassword(resetTarget.employee_id);
      setResetTarget(null);
      setResetResult(result);
    } catch (err) {
      setResetError(extractErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  };

  const hasNextPage = skip + PAGE_SIZE < total;
  const hasPrevPage = skip > 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text">User Management</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Add employees, assign roles, and manage access for your organization.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus size={16} aria-hidden="true" />
          Add Employee
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {!loadError && !isLoading && users.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
            <UserCog size={20} aria-hidden="true" />
          </span>
          <p className="font-medium text-text">No employees yet</p>
          <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
            Add your first employee to start assigning roles and tracking timesheets.
          </p>
          <Button className="mt-5" onClick={openCreateDialog}>
            <Plus size={16} aria-hidden="true" />
            Add Employee
          </Button>
        </div>
      )}

      {!loadError && (isLoading || users.length > 0) && (
        <Card className="mt-6 gap-0 py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                  <th className="px-6 py-3.5 font-semibold">Name</th>
                  <th className="px-6 py-3.5 font-semibold">Email</th>
                  <th className="px-6 py-3.5 font-semibold">Roles</th>
                  <th className="px-6 py-3.5 font-semibold">Designation</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4" colSpan={6}>
                          <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                        </td>
                      </tr>
                    ))
                  : users.map((user) => (
                      <tr key={user.employee_id} className="border-b border-border last:border-b-0 hover:bg-bg">
                        <td className="px-6 py-4 font-medium text-text">
                          {user.first_name} {user.last_name}
                        </td>
                        <td className="px-6 py-4 text-text-secondary">{user.email}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {user.roles.length > 0
                              ? user.roles.map((role) => (
                                  <Badge key={role} variant="muted">
                                    {role}
                                  </Badge>
                                ))
                              : "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary">{user.designation_id || "—"}</td>
                        <td className="px-6 py-4">
                          <Badge variant={user.status === "Active" ? "active" : "muted"}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${user.first_name} ${user.last_name}`}
                              onClick={() => openEditDialog(user)}
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Manage roles for ${user.first_name} ${user.last_name}`}
                              onClick={() => openRolesDialog(user)}
                            >
                              <ShieldCheck size={16} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Reset password for ${user.first_name} ${user.last_name}`}
                              onClick={() => {
                                setResetError(null);
                                setResetTarget(user);
                              }}
                            >
                              <KeyRound size={16} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={
                                user.status === "Active"
                                  ? `Deactivate ${user.first_name} ${user.last_name}`
                                  : `Reactivate ${user.first_name} ${user.last_name}`
                              }
                              onClick={() => {
                                setStatusError(null);
                                setStatusTarget(user);
                              }}
                            >
                              {user.status === "Active" ? <Power size={16} /> : <RotateCcw size={16} />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </CardContent>

          {!isLoading && total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-6 py-3.5 text-sm text-text-secondary">
              <span>
                Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasPrevPage}
                  onClick={() => loadUsers(Math.max(skip - PAGE_SIZE, 0))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasNextPage}
                  onClick={() => loadUsers(skip + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Add / edit employee */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit employee" : "Add employee"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update this employee's profile details."
                : "Add an employee and assign their initial roles. A temporary password will be generated."}
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleFormSubmit} noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-first-name">First name</Label>
                <Input
                  id="user-first-name"
                  value={form.first_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-last-name">Last name</Label>
                <Input
                  id="user-last-name"
                  value={form.last_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                disabled={Boolean(editingUser)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-phone">Phone</Label>
                <Input
                  id="user-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-designation">Designation</Label>
                <Input
                  id="user-designation"
                  value={form.designation_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, designation_id: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-doj">Date of joining</Label>
              <Input
                id="user-doj"
                type="date"
                value={form.date_of_joining}
                onChange={(event) => setForm((prev) => ({ ...prev, date_of_joining: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-description">Description</Label>
              <Textarea
                id="user-description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            {!editingUser && (
              <div className="flex flex-col gap-1.5">
                <Label>Roles</Label>
                <div className="flex flex-col gap-2 rounded-field border border-input p-3">
                  {roles.length === 0 && (
                    <p className="text-sm text-text-secondary">No roles available.</p>
                  )}
                  {roles
                    .filter((role) => role.is_active)
                    .map((role) => (
                      <label key={role.id} className="flex items-center gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={form.role_ids.includes(role.id)}
                          onChange={() => toggleFormRole(role.id)}
                        />
                        {role.name}
                      </label>
                    ))}
                </div>
              </div>
            )}

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingUser ? "Save changes" : "Add employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Temporary password after creation */}
      <Dialog open={Boolean(credentials)} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee created</DialogTitle>
            <DialogDescription>
              Share these credentials with the employee securely. The temporary password will not be shown
              again.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="flex flex-col gap-2 rounded-field border border-input bg-bg p-4 text-sm">
              <div>
                <span className="text-text-secondary">Employee ID: </span>
                <span className="font-medium text-text">{credentials.employee_id}</span>
              </div>
              <div>
                <span className="text-text-secondary">Email: </span>
                <span className="font-medium text-text">{credentials.email}</span>
              </div>
              <div>
                <span className="text-text-secondary">Temporary password: </span>
                <span className="font-mono font-medium text-text">{credentials.temporary_password}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setCredentials(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage roles */}
      <Dialog open={Boolean(rolesTarget)} onOpenChange={(open) => !open && setRolesTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage roles</DialogTitle>
            <DialogDescription>
              {rolesTarget && (
                <>
                  Choose which roles <strong className="text-text">{rolesTarget.first_name} {rolesTarget.last_name}</strong> should
                  hold. A user must always keep at least one role.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 rounded-field border border-input p-3">
            {roles
              .filter((role) => role.is_active)
              .map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => toggleSelectedRole(role.id)}
                  />
                  {role.name}
                </label>
              ))}
          </div>

          {rolesError && (
            <Alert variant="destructive">
              <AlertDescription>{rolesError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRolesTarget(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveRoles} disabled={isSavingRoles}>
              {isSavingRoles ? "Saving..." : "Save roles"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate / deactivate */}
      <Dialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusTarget?.status === "Active" ? "Deactivate employee" : "Reactivate employee"}
            </DialogTitle>
            <DialogDescription>
              {statusTarget && statusTarget.status === "Active" && (
                <>
                  <strong className="text-text">
                    {statusTarget.first_name} {statusTarget.last_name}
                  </strong>{" "}
                  will be marked inactive and lose access to the system. This can be reversed later.
                </>
              )}
              {statusTarget && statusTarget.status !== "Active" && (
                <>
                  <strong className="text-text">
                    {statusTarget.first_name} {statusTarget.last_name}
                  </strong>{" "}
                  will regain access to the system.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {statusError && (
            <Alert variant="destructive">
              <AlertDescription>{statusError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStatusTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={statusTarget?.status === "Active" ? "destructive" : "default"}
              onClick={handleChangeStatus}
              disabled={isChangingStatus}
            >
              {isChangingStatus
                ? "Saving..."
                : statusTarget?.status === "Active"
                  ? "Deactivate"
                  : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={Boolean(resetTarget)} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {resetTarget && (
                <>
                  A new temporary password will be generated for{" "}
                  <strong className="text-text">
                    {resetTarget.first_name} {resetTarget.last_name}
                  </strong>
                  . Their current password will stop working immediately.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {resetError && (
            <Alert variant="destructive">
              <AlertDescription>{resetError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleResetPassword} disabled={isResetting}>
              {isResetting ? "Resetting..." : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temporary password after reset */}
      <Dialog open={Boolean(resetResult)} onOpenChange={(open) => !open && setResetResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password reset</DialogTitle>
            <DialogDescription>
              Share this temporary password with the employee securely. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          {resetResult && (
            <div className="flex flex-col gap-2 rounded-field border border-input bg-bg p-4 text-sm">
              <div>
                <span className="text-text-secondary">Employee ID: </span>
                <span className="font-medium text-text">{resetResult.employee_id}</span>
              </div>
              <div>
                <span className="text-text-secondary">Temporary password: </span>
                <span className="font-mono font-medium text-text">{resetResult.temporary_password}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setResetResult(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
