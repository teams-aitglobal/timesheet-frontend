import { apiClient } from "./client";
import type { PaginatedResponse } from "./clients";

export type ClientSpocStatus = "Active" | "Inactive";

export interface ClientSpoc {
  client_spoc_id: string;
  client_id: string;
  client_spoc_name: string;
  email: string;
  phone: string;
  designation: string | null;
  is_primary: boolean;
  status: ClientSpocStatus;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ClientSpocCreateInput {
  client_id: string;
  client_spoc_name: string;
  email: string;
  phone: string;
  designation?: string | null;
  is_primary?: boolean;
}

export type ClientSpocUpdateInput = Partial<Omit<ClientSpocCreateInput, "client_id">> & {
  status?: ClientSpocStatus;
};

export async function listClientSpocs(
  params: { client_id?: string; skip?: number; limit?: number } = {},
): Promise<PaginatedResponse<ClientSpoc>> {
  const { data } = await apiClient.get<PaginatedResponse<ClientSpoc>>("/client-spocs", { params });
  return data;
}

export async function createClientSpoc(payload: ClientSpocCreateInput): Promise<ClientSpoc> {
  const { data } = await apiClient.post<ClientSpoc>("/client-spocs", payload);
  return data;
}

export async function updateClientSpoc(id: string, payload: ClientSpocUpdateInput): Promise<ClientSpoc> {
  const { data } = await apiClient.patch<ClientSpoc>(`/client-spocs/${id}`, payload);
  return data;
}

export async function deactivateClientSpoc(id: string): Promise<ClientSpoc> {
  const { data } = await apiClient.delete<ClientSpoc>(`/client-spocs/${id}`);
  return data;
}

export async function reactivateClientSpoc(id: string): Promise<ClientSpoc> {
  return updateClientSpoc(id, { status: "Active" });
}
