import { useEffect, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Users } from "lucide-react";

import {
  createClient,
  deactivateClient,
  listClients,
  reactivateClient,
  updateClient,
  type Client,
  type ClientCreateInput,
} from "@/api/clients";
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

const PAGE_SIZE = 20;

const EMPTY_FORM: ClientCreateInput = {
  client_name: "",
  email: "",
  phone: "",
  industry: "",
  description: "",
};

function toFormValues(client: Client): ClientCreateInput {
  return {
    client_name: client.client_name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    industry: client.industry ?? "",
    description: client.description ?? "",
  };
}

function toPayload(form: ClientCreateInput): ClientCreateInput {
  return {
    client_name: form.client_name.trim(),
    email: form.email?.trim() || null,
    phone: form.phone?.trim() || null,
    industry: form.industry?.trim() || null,
    description: form.description?.trim() || null,
  };
}

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientCreateInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<Client | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [reactivateError, setReactivateError] = useState<string | null>(null);

  const loadClients = async (nextSkip: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listClients({ skip: nextSkip, limit: PAGE_SIZE });
      setClients(data.items);
      setTotal(data.total);
      setSkip(data.skip);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients(0);
  }, []);

  const openCreateDialog = () => {
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setForm(toFormValues(client));
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const payload = toPayload(form);
      if (editingClient) {
        await updateClient(editingClient.client_id, payload);
      } else {
        await createClient(payload);
      }
      setFormOpen(false);
      await loadClients(editingClient ? skip : 0);
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
      await deactivateClient(deactivateTarget.client_id);
      setDeactivateTarget(null);
      await loadClients(skip);
    } catch (err) {
      setDeactivateError(extractErrorMessage(err));
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivate = async (client: Client) => {
    setReactivateError(null);
    setReactivatingId(client.client_id);
    try {
      await reactivateClient(client.client_id);
      await loadClients(skip);
    } catch (err) {
      setReactivateError(extractErrorMessage(err));
    } finally {
      setReactivatingId(null);
    }
  };

  const handleStatusToggle = (client: Client, next: boolean) => {
    if (next) {
      handleReactivate(client);
    } else {
      setDeactivateError(null);
      setDeactivateTarget(client);
    }
  };

  const hasNextPage = skip + PAGE_SIZE < total;
  const hasPrevPage = skip > 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text">Clients</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Add and manage the clients your organization delivers work for.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus size={16} aria-hidden="true" />
          Add Client
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

      {!loadError && !isLoading && clients.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-20 text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
            <Users size={20} aria-hidden="true" />
          </span>
          <p className="font-medium text-text">No clients yet</p>
          <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
            Add your first client to start assigning projects and tracking timesheets.
          </p>
          <Button className="mt-5" onClick={openCreateDialog}>
            <Plus size={16} aria-hidden="true" />
            Add Client
          </Button>
        </div>
      )}

      {!loadError && (isLoading || clients.length > 0) && (
        <Card className="mt-6 gap-0 py-0">
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                  <th className="px-6 py-3.5 font-semibold">Name</th>
                  <th className="px-6 py-3.5 font-semibold">Industry</th>
                  <th className="px-6 py-3.5 font-semibold">Description</th>
                  <th className="px-6 py-3.5 font-semibold">Email</th>
                  <th className="px-6 py-3.5 font-semibold">Phone</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4" colSpan={7}>
                          <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                        </td>
                      </tr>
                    ))
                  : clients.map((client) => (
                      <tr
                        key={client.client_id}
                        className="cursor-pointer border-b border-border last:border-b-0 hover:bg-bg"
                        onClick={() => navigate(`/clients/${client.client_id}`)}
                      >
                        <td className="px-6 py-4 font-medium text-text">{client.client_name}</td>
                        <td className="px-6 py-4 text-text-secondary">{client.industry || "—"}</td>
                        <td
                          className="max-w-[220px] truncate px-6 py-4 text-text-secondary"
                          title={client.description ?? undefined}
                        >
                          {client.description || "—"}
                        </td>
                        <td className="px-6 py-4 text-text-secondary">{client.email || "—"}</td>
                        <td className="px-6 py-4 text-text-secondary">{client.phone || "—"}</td>
                        <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={client.status === "Active"}
                              disabled={reactivatingId === client.client_id || isDeactivating}
                              onCheckedChange={(next) => handleStatusToggle(client, next)}
                              aria-label={`Toggle status for ${client.client_name}`}
                            />
                            <span
                              className={
                                client.status === "Active"
                                  ? "text-sm font-medium text-badge-active-text"
                                  : "text-sm text-text-secondary"
                              }
                            >
                              {client.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${client.client_name}`}
                              onClick={() => openEditDialog(client)}
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
                  onClick={() => loadClients(Math.max(skip - PAGE_SIZE, 0))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasNextPage}
                  onClick={() => loadClients(skip + PAGE_SIZE)}
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
            <DialogTitle>{editingClient ? "Edit client" : "Add client"}</DialogTitle>
            <DialogDescription>
              {editingClient
                ? "Update the client's details."
                : "Add a client to start assigning projects to them."}
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleFormSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-name">Client name</Label>
              <Input
                id="client-name"
                value={form.client_name}
                onChange={(event) => setForm((prev) => ({ ...prev, client_name: event.target.value }))}
                aria-invalid={Boolean(formError)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-industry">Industry</Label>
              <Input
                id="client-industry"
                value={form.industry ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, industry: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-description">Description</Label>
              <Textarea
                id="client-description"
                value={form.description ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={form.email ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                type="tel"
                value={form.phone ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
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
                {isSaving ? "Saving..." : editingClient ? "Save changes" : "Add client"}
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
            <DialogTitle>Deactivate client</DialogTitle>
            <DialogDescription>
              {deactivateTarget && (
                <>
                  <strong className="text-text">{deactivateTarget.client_name}</strong> will be marked
                  inactive and hidden from new project assignments. This can be reversed later by an
                  administrator.
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
