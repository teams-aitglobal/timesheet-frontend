import { useEffect, useState, type SubmitEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Star, UserRound } from "lucide-react";

import { getClient, type Client } from "@/api/clients";
import {
  createClientSpoc,
  deactivateClientSpoc,
  listClientSpocs,
  reactivateClientSpoc,
  updateClientSpoc,
  type ClientSpoc,
  type ClientSpocCreateInput,
} from "@/api/clientSpocs";
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
import { Switch } from "@/components/ui/switch";

type SpocFormValues = Omit<ClientSpocCreateInput, "client_id">;

const EMPTY_SPOC_FORM: SpocFormValues = {
  client_spoc_name: "",
  email: "",
  phone: "",
  designation: "",
  is_primary: false,
};

function toSpocFormValues(spoc: ClientSpoc): SpocFormValues {
  return {
    client_spoc_name: spoc.client_spoc_name,
    email: spoc.email,
    phone: spoc.phone,
    designation: spoc.designation ?? "",
    is_primary: spoc.is_primary,
  };
}

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const [spocs, setSpocs] = useState<ClientSpoc[]>([]);
  const [isLoadingSpocs, setIsLoadingSpocs] = useState(true);
  const [spocsError, setSpocsError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSpoc, setEditingSpoc] = useState<ClientSpoc | null>(null);
  const [form, setForm] = useState<SpocFormValues>(EMPTY_SPOC_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<ClientSpoc | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [reactivateError, setReactivateError] = useState<string | null>(null);

  const loadClient = async () => {
    if (!clientId) return;
    setIsLoadingClient(true);
    setClientError(null);
    try {
      const data = await getClient(clientId);
      setClient(data);
    } catch (err) {
      setClientError(extractErrorMessage(err));
    } finally {
      setIsLoadingClient(false);
    }
  };

  const loadSpocs = async () => {
    if (!clientId) return;
    setIsLoadingSpocs(true);
    setSpocsError(null);
    try {
      const data = await listClientSpocs({ client_id: clientId, limit: 200 });
      setSpocs(data.items);
    } catch (err) {
      setSpocsError(extractErrorMessage(err));
    } finally {
      setIsLoadingSpocs(false);
    }
  };

  useEffect(() => {
    loadClient();
    loadSpocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const openCreateDialog = () => {
    setEditingSpoc(null);
    setForm(EMPTY_SPOC_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditDialog = (spoc: ClientSpoc) => {
    setEditingSpoc(spoc);
    setForm(toSpocFormValues(spoc));
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clientId) return;
    setFormError(null);
    setIsSaving(true);

    try {
      const payload = {
        client_spoc_name: form.client_spoc_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        designation: form.designation?.trim() || null,
        is_primary: form.is_primary ?? false,
      };

      if (editingSpoc) {
        await updateClientSpoc(editingSpoc.client_spoc_id, payload);
      } else {
        await createClientSpoc({ client_id: clientId, ...payload });
      }
      setFormOpen(false);
      await loadSpocs();
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
      await deactivateClientSpoc(deactivateTarget.client_spoc_id);
      setDeactivateTarget(null);
      await loadSpocs();
    } catch (err) {
      setDeactivateError(extractErrorMessage(err));
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivate = async (spoc: ClientSpoc) => {
    setReactivateError(null);
    setReactivatingId(spoc.client_spoc_id);
    try {
      await reactivateClientSpoc(spoc.client_spoc_id);
      await loadSpocs();
    } catch (err) {
      setReactivateError(extractErrorMessage(err));
    } finally {
      setReactivatingId(null);
    }
  };

  const handleStatusToggle = (spoc: ClientSpoc, next: boolean) => {
    if (next) {
      handleReactivate(spoc);
    } else {
      setDeactivateError(null);
      setDeactivateTarget(spoc);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" aria-label="Back to clients" onClick={() => navigate("/clients")}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="font-serif text-2xl font-bold text-text">
            {isLoadingClient ? "Loading client…" : client?.client_name ?? "Client"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            <Link to="/clients" className="hover:underline">
              Clients
            </Link>{" "}
            / {client?.client_name ?? "…"}
          </p>
        </div>
      </div>

      {clientError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{clientError}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        {/* Left: client information */}
        <Card className="h-fit">
          <CardContent className="flex flex-col gap-4">
            {isLoadingClient ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-4 w-full animate-pulse rounded bg-bg" />
                ))}
              </div>
            ) : client ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-text">Client information</h2>
                  <Badge variant={client.status === "Active" ? "active" : "muted"}>{client.status}</Badge>
                </div>

                <dl className="flex flex-col gap-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Name</dt>
                    <dd className="mt-0.5 text-text">{client.client_name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Industry</dt>
                    <dd className="mt-0.5 text-text-secondary">{client.industry || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Description</dt>
                    <dd className="mt-0.5 text-text-secondary">{client.description || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Email</dt>
                    <dd className="mt-0.5 text-text-secondary">{client.email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-label">Phone</dt>
                    <dd className="mt-0.5 text-text-secondary">{client.phone || "—"}</dd>
                  </div>
                </dl>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Right: client SPOCs */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-text">SPOCs</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Single points of contact for this client.
              </p>
            </div>
            <Button onClick={openCreateDialog} disabled={!clientId}>
              <Plus size={16} aria-hidden="true" />
              Add SPOC
            </Button>
          </div>

          {spocsError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{spocsError}</AlertDescription>
            </Alert>
          )}

          {reactivateError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{reactivateError}</AlertDescription>
            </Alert>
          )}

          {!spocsError && !isLoadingSpocs && spocs.length === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface py-16 text-center">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg text-label">
                <UserRound size={20} aria-hidden="true" />
              </span>
              <p className="font-medium text-text">No SPOCs yet</p>
              <p className="mt-1 max-w-[320px] text-sm text-text-secondary">
                Add a point of contact for this client.
              </p>
              <Button className="mt-5" onClick={openCreateDialog}>
                <Plus size={16} aria-hidden="true" />
                Add SPOC
              </Button>
            </div>
          )}

          {!spocsError && (isLoadingSpocs || spocs.length > 0) && (
            <Card className="mt-4 gap-0 py-0">
              <CardContent className="overflow-x-auto px-0">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.04em] text-label">
                      <th className="px-6 py-3.5 font-semibold">Name</th>
                      <th className="px-6 py-3.5 font-semibold">Designation</th>
                      <th className="px-6 py-3.5 font-semibold">Email</th>
                      <th className="px-6 py-3.5 font-semibold">Phone</th>
                      <th className="px-6 py-3.5 font-semibold">Status</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingSpocs
                      ? Array.from({ length: 3 }).map((_, index) => (
                          <tr key={index} className="border-b border-border last:border-b-0">
                            <td className="px-6 py-4" colSpan={6}>
                              <div className="h-4 w-full max-w-[420px] animate-pulse rounded bg-bg" />
                            </td>
                          </tr>
                        ))
                      : spocs.map((spoc) => (
                          <tr key={spoc.client_spoc_id} className="border-b border-border last:border-b-0">
                            <td className="px-6 py-4 font-medium text-text">
                              <span className="inline-flex items-center gap-1.5">
                                {spoc.client_spoc_name}
                                {spoc.is_primary && (
                                  <Star
                                    size={14}
                                    className="fill-badge-active-text text-badge-active-text"
                                    aria-label="Primary SPOC"
                                  />
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-text-secondary">{spoc.designation || "—"}</td>
                            <td className="px-6 py-4 text-text-secondary">{spoc.email}</td>
                            <td className="px-6 py-4 text-text-secondary">{spoc.phone}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={spoc.status === "Active"}
                                  disabled={reactivatingId === spoc.client_spoc_id || isDeactivating}
                                  onCheckedChange={(next) => handleStatusToggle(spoc, next)}
                                  aria-label={`Toggle status for ${spoc.client_spoc_name}`}
                                />
                                <span
                                  className={
                                    spoc.status === "Active"
                                      ? "text-sm font-medium text-badge-active-text"
                                      : "text-sm text-text-secondary"
                                  }
                                >
                                  {spoc.status}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Edit ${spoc.client_spoc_name}`}
                                  onClick={() => openEditDialog(spoc)}
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
            </Card>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSpoc ? "Edit SPOC" : "Add SPOC"}</DialogTitle>
            <DialogDescription>
              {editingSpoc
                ? "Update this client SPOC's details."
                : "Add a single point of contact for this client."}
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4" onSubmit={handleFormSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spoc-name">Name</Label>
              <Input
                id="spoc-name"
                value={form.client_spoc_name}
                onChange={(event) => setForm((prev) => ({ ...prev, client_spoc_name: event.target.value }))}
                aria-invalid={Boolean(formError)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spoc-designation">Designation</Label>
              <Input
                id="spoc-designation"
                value={form.designation ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, designation: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spoc-email">Email</Label>
              <Input
                id="spoc-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                aria-invalid={Boolean(formError)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spoc-phone">Phone</Label>
              <Input
                id="spoc-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                aria-invalid={Boolean(formError)}
                required
              />
            </div>

            <label htmlFor="spoc-primary" className="flex items-center gap-2 text-sm text-text">
              <input
                id="spoc-primary"
                type="checkbox"
                className="h-4 w-4 rounded border-border text-primary accent-primary"
                checked={form.is_primary ?? false}
                onChange={(event) => setForm((prev) => ({ ...prev, is_primary: event.target.checked }))}
              />
              Primary SPOC
            </label>

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
                {isSaving ? "Saving..." : editingSpoc ? "Save changes" : "Add SPOC"}
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
            <DialogTitle>Deactivate SPOC</DialogTitle>
            <DialogDescription>
              {deactivateTarget && (
                <>
                  <strong className="text-text">{deactivateTarget.client_spoc_name}</strong> will be marked
                  inactive as a contact for this client. This can be reversed later by an administrator.
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
