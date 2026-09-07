import { isAxiosError } from "axios";
import { apiClient } from "./client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  must_change_password: boolean;
}

export interface MeResponse {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  designation_id: string | null;
  roles: string[];
  permissions: string[];
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", payload);
  return data;
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>("/auth/me");
  return data;
}

export interface UpdateMeRequest {
  first_name?: string;
  last_name?: string;
}

export async function updateMe(payload: UpdateMeRequest): Promise<MeResponse> {
  const { data } = await apiClient.patch<MeResponse>("/auth/me", payload);
  return data;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export async function changePassword(payload: ChangePasswordRequest): Promise<void> {
  await apiClient.post("/auth/change-password", payload);
}

export function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (typeof first?.msg === "string") {
        return first.msg;
      }
    }
    if (error.code === "ERR_NETWORK") {
      return "Could not reach the server. Please check your connection and try again.";
    }
  }
  return "Something went wrong. Please try again.";
}
