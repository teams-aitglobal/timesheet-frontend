import { apiClient } from "./client";

export type UserStatus = "Active" | "Inactive";

export interface User {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  designation_id: string | null;
  date_of_joining: string | null;
  description: string | null;
  status: UserStatus;
  is_verified: boolean;
  must_change_password: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
  roles: string[];
}

export interface UserCreateInput {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  designation_id?: string | null;
  date_of_joining?: string | null;
  description?: string | null;
  role_ids: string[];
}

export type UserUpdateInput = Partial<
  Omit<UserCreateInput, "email" | "role_ids">
> & { status?: UserStatus };

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface UserCreateResponse extends User {
  temporary_password: string;
}

export interface PasswordResetResponse {
  employee_id: string;
  temporary_password: string;
}

export async function listUsers(
  params: { skip?: number; limit?: number; search?: string } = {},
): Promise<PaginatedResponse<User>> {
  const { data } = await apiClient.get<PaginatedResponse<User>>("/users", { params });
  return data;
}

export async function getUser(id: string): Promise<User> {
  const { data } = await apiClient.get<User>(`/users/${id}`);
  return data;
}

export async function createUser(payload: UserCreateInput): Promise<UserCreateResponse> {
  const { data } = await apiClient.post<UserCreateResponse>("/users", payload);
  return data;
}

export async function updateUser(id: string, payload: UserUpdateInput): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${id}`, payload);
  return data;
}

export async function deactivateUser(id: string): Promise<User> {
  const { data } = await apiClient.delete<User>(`/users/${id}`);
  return data;
}

export async function assignRoles(id: string, roleIds: string[]): Promise<User> {
  const { data } = await apiClient.post<User>(`/users/${id}/roles`, { role_ids: roleIds });
  return data;
}

export async function removeRole(id: string, roleId: string): Promise<User> {
  const { data } = await apiClient.delete<User>(`/users/${id}/roles/${roleId}`);
  return data;
}

export async function resetPassword(id: string): Promise<PasswordResetResponse> {
  const { data } = await apiClient.post<PasswordResetResponse>(`/users/${id}/reset-password`);
  return data;
}

export async function listRoles(): Promise<Role[]> {
  const { data } = await apiClient.get<Role[]>("/roles");
  return data;
}
