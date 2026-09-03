import { useEffect, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Pencil, Plus } from "lucide-react";

import {
  createProject,
  deactivateProject,
  listProjects,
  reactivateProject,
  updateProject,
  type Project,
  type ProjectCreateInput,
} from "@/api/projects";
import { listClients, type Client } from "@/api/clients";
import { listUsers, type User } from "@/api/users";
import { listClientSpocs, type ClientSpoc } from "@/api/clientSpocs";
import { extractErrorMessage } from "@/api/auth";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const selectClassName = cn(
  "flex h-10 w-full min-w-0 rounded-field border border-input bg-surface px-3.5 py-[9px] text-sm text-text transition-colors outline-none",
  "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/12",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

interface FormValues {
  project_name: string;
  client_id: string;
  project_manager_id: string;
  client_spoc_id: string;
  project_start_date: string;
  project_end_date: string;
  project_description: string;
  budget_hours: string;
}

const EMPTY_FORM: FormValues = {
  project_name: "",
  client_id: "",
  project_manager_id: "",
  client_spoc_id: "",
  project_start_date: "",
  project_end_date: "",
  project_description: "",
  budget_hours: "",
};

function toFormValues(project: Project): FormValues {
  return {
    project_name: project.project_name,
    client_id: project.client_id,
    project_manager_id: project.project_manager_id,
    client_spoc_id: project.client_spoc_id ?? "",
    project_start_date: project.project_start_date,
    project_end_date: project.project_end_date ?? "",
    project_description: project.project_description ?? "",
    budget_hours: project.budget_hours != null ? String(project.budget_hours) : "",
  };
}

function toCreatePayload(form: FormValues): ProjectCreateInput {
  return {
    project_name: form.project_name.trim(),
    client_id: form.client_id,
    project_manager_id: form.project_manager_id,
    client_spoc_id: form.client_spoc_id || null,
    project_start_date: form.project_start_date,
    project_end_date: form.project_end_date || null,
    project_description: form.project_description.trim() || null,
    budget_hours: form.budget_hours ? Number(form.budget_hours) : null,
  };
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [spocOptions, setSpocOptions] = useState<ClientSpoc[]>([]);
  const [isLoadingSpocOptions, setIsLoadingSpocOptions] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<Project | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [reactivateError, setReactivateError] = useState<string | null>(null);

  const loadProjects = async (nextSkip: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listProjects({ skip: nextSkip, limit: PAGE_SIZE });
      setProjects(data.items);
      setTotal(data.total);
      setSkip(data.skip);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [clientsData, usersData] = await Promise.all([
        listClients({ limit: 200 }),
        listUsers({ limit: 200 }),
      ]);
      setClients(clientsData.items);
      setManagers(usersData.items);
    } catch {
      // Lookup failures surface as missing names in the table; the form still
      // reports its own load error if a submit is attempted without options.
    }
  };

  useEffect(() => {
    loadProjects(0);
    loadLookups();
  }, []);

  useEffect(() => {
    if (!form.client_id) {
      setSpocOptions([]);
      return;
    }
    let cancelled = false;
    setIsLoadingSpocOptions(true);
    listClientSpocs({ client_id: form.client_id, limit: 200 })
      .then((data) => {
        if (!cancelled) setSpocOptions(data.items);
      })
      .catch(() => {
        if (!cancelled) setSpocOptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSpocOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.client_id]);

  const clientName = (clientId: string) => clients.find((c) => c.client_id === clientId)?.client_name ?? clientId;
  const managerName = (managerId: string) => {
    const manager = managers.find((u) => u.employee_id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name}` : managerId;
  };

  const openCreateDialog = () => {
    setEditingProject(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setForm(toFormValues(project));
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      if (editingProject) {
        const { client_id: _clientId, ...updatePayload } = toCreatePayload(form);
        await updateProject(editingProject.project_id, updatePayload);
      } else {
        await createProject(toCreatePayload(form));
      }
      setFormOpen(false);
      await loadProjects(editingProject ? skip : 0);
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    setDeactivateError(null);
    try {
      await deactivateProject(deactivateTarget.project_id);
      setDeactivateTarget(null);
      await loadProjects(skip);
    } catch (err) {
      setDeactivateError(extractErrorMessage(err));
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivate = async (project: Project) => {
    setReactivateError(null);
    setReactivatingId(project.project_id);
    try {
      await reactivateProject(project.project_id);
      await loadProjects(skip);
    } catch (err) {
      setReactivateError(extractErrorMessage(err));
    } finally {
      setReactivatingId(null);
    }
  };

  const handleStatusToggle = (project: Project, next: boolean) => {
    if (next) {
      handleReactivate(project);
    } else {
      setDeactivateError(null);
      setDeactivateTarget(project);
    }
  };

  const hasNextPage = skip + PAGE_SIZE < total;
  const hasPrevPage = skip > 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text">Projects</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create and manage projects delivered for your clients.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus size={16} aria-hidden="true" />
          Add Project
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {reactivateError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{reactivateError}</AlertDescription>
        </Alert>
      )}

      {!loadError && !isLoading && projects.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
            <FolderKanban size={20} aria-hidden="true" />
          </span>
          <p className="font-medium text-text">No projects yet</p>
          <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
            Add your first project to start tracking work against a client.
          </p>
          <Button className="mt-5" onClick={openCreateDialog}>
            <Plus size={16} aria-hidden="true" />
            Add Project
          </Button>
        </div>
      )}

      {!loadError && (isLoading || projects.length > 0) && (
        <Card className="mt-6 gap-0 py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                  <th className="px-6 py-3.5 font-semibold">Project</th>
                  <th className="px-6 py-3.5 font-semibold">Client</th>
                  <th className="px-6 py-3.5 font-semibold">Manager</th>
                  <th className="px-6 py-3.5 font-semibold">Start</th>
                  <th className="px-6 py-3.5 font-semibold">End</th>
                  <th className="px-6 py-3.5 font-semibold">Budget (hrs)</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4" colSpan={8}>
                          <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                        </td>
                      </tr>
                    ))
                  : projects.map((project) => (
                      <tr
                        key={project.project_id}
                        className="cursor-pointer border-b border-border last:border-b-0 hover:bg-bg"
                        onClick={() => navigate(`/projects/${project.project_id}`)}
                      >
                        <td className="px-6 py-4 font-medium text-text">{project.project_name}</td>
                        <td className="px-6 py-4 text-text-secondary">{clientName(project.client_id)}</td>
                        <td className="px-6 py-4 text-text-secondary">
                          {managerName(project.project_manager_id)}
                        </td>
                        <td className="px-6 py-4 text-text-secondary">{project.project_start_date}</td>
                        <td className="px-6 py-4 text-text-secondary">{project.project_end_date || "—"}</td>
                        <td className="px-6 py-4 text-text-secondary">{project.budget_hours ?? "—"}</td>
                        <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={project.status === "Active"}
                              disabled={reactivatingId === project.project_id || isDeactivating}
                              onCheckedChange={(next) => handleStatusToggle(project, next)}
                              aria-label={`Toggle status for ${project.project_name}`}
                            />
                            <span
                              className={
                                project.status === "Active"
                                  ? "text-sm font-medium text-badge-active-text"
                                  : "text-sm text-text-secondary"
                              }
                            >
                              {project.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${project.project_name}`}
                              onClick={() => openEditDialog(project)}
                            >
                              <Pencil size={16} />
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
                  onClick={() => loadProjects(Math.max(skip - PAGE_SIZE, 0))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasNextPage}
                  onClick={() => loadProjects(skip + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit project" : "Add project"}</DialogTitle>
            <DialogDescription>
              {editingProject
                ? "Update the project's details."
                : "Create a project and assign it to a client."}
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleFormSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={form.project_name}
                onChange={(event) => setForm((prev) => ({ ...prev, project_name: event.target.value }))}
                aria-invalid={Boolean(formError)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-client">Client</Label>
              <select
                id="project-client"
                className={selectClassName}
                value={form.client_id}
                disabled={Boolean(editingProject)}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, client_id: event.target.value, client_spoc_id: "" }))
                }
                required
              >
                <option value="" disabled>
                  Select a client
                </option>
                {clients.map((c) => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-manager">Project manager</Label>
              <select
                id="project-manager"
                className={selectClassName}
                value={form.project_manager_id}
                onChange={(event) => setForm((prev) => ({ ...prev, project_manager_id: event.target.value }))}
                required
              >
                <option value="" disabled>
                  Select a project manager
                </option>
                {managers.map((u) => (
                  <option key={u.employee_id} value={u.employee_id}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-spoc">Client SPOC</Label>
              <select
                id="project-spoc"
                className={selectClassName}
                value={form.client_spoc_id}
                disabled={!form.client_id || isLoadingSpocOptions}
                onChange={(event) => setForm((prev) => ({ ...prev, client_spoc_id: event.target.value }))}
              >
                <option value="">
                  {form.client_id ? "None" : "Select a client first"}
                </option>
                {spocOptions.map((s) => (
                  <option key={s.client_spoc_id} value={s.client_spoc_id}>
                    {s.client_spoc_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project-start">Start date</Label>
                <Input
                  id="project-start"
                  type="date"
                  value={form.project_start_date}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, project_start_date: event.target.value }))
                  }
                  aria-invalid={Boolean(formError)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project-end">End date</Label>
                <Input
                  id="project-end"
                  type="date"
                  value={form.project_end_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, project_end_date: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-budget">Budget hours</Label>
              <Input
                id="project-budget"
                type="number"
                min="0"
                step="0.5"
                value={form.budget_hours}
                onChange={(event) => setForm((prev) => ({ ...prev, budget_hours: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={form.project_description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, project_description: event.target.value }))
                }
              />
            </div>

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
                {isSaving ? "Saving..." : editingProject ? "Save changes" : "Add project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate project</DialogTitle>
            <DialogDescription>
              {deactivateTarget && (
                <>
                  <strong className="text-text">{deactivateTarget.project_name}</strong> will be marked
                  inactive. This can be reversed later by an administrator.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {deactivateError && (
            <Alert variant="destructive">
              <AlertDescription>{deactivateError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeactivateTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeactivate} disabled={isDeactivating}>
              {isDeactivating ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
