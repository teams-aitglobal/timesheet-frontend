import { apiClient } from "./client";

export type ClientStatus = "Active" | "Inactive";

export interface Client {
  client_id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  description: string | null;
  status: ClientStatus;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ClientCreateInput {
  client_name: string;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  description?: string | null;
}

export type ClientUpdateInput = Partial<ClientCreateInput> & {
  status?: ClientStatus;
};

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export async function listClients(params: { skip?: number; limit?: number } = {}): Promise<
  PaginatedResponse<Client>
> {
  const { data } = await apiClient.get<PaginatedResponse<Client>>("/clients", { params });
  return data;
}

export async function getClient(id: string): Promise<Client> {
  const { data } = await apiClient.get<Client>(`/clients/${id}`);
  return data;
}

export async function createClient(payload: ClientCreateInput): Promise<Client> {
  const { data } = await apiClient.post<Client>("/clients", payload);
  return data;
}

export async function updateClient(id: string, payload: ClientUpdateInput): Promise<Client> {
  const { data } = await apiClient.patch<Client>(`/clients/${id}`, payload);
  return data;
}

export async function deactivateClient(id: string): Promise<Client> {
  const { data } = await apiClient.delete<Client>(`/clients/${id}`);
  return data;
}

export async function reactivateClient(id: string): Promise<Client> {
  return updateClient(id, { status: "Active" });
}
