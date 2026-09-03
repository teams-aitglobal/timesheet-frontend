import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Access tokens are short-lived (15 min). Refresh tokens rotate on use (single-use),
// so concurrent 401s must share one in-flight refresh instead of each spending it.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }
  const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
    `${API_URL}/auth/refresh`,
    { refresh_token: refreshToken },
  );
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  return data.access_token;
}

function clearSessionAndNotify() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.dispatchEvent(new Event("auth:session-expired"));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const isLoginRequest = originalRequest?.url?.includes("/auth/login");

    if (error.response?.status !== 401 || !originalRequest || isLoginRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearSessionAndNotify();
      return Promise.reject(refreshError);
    }
  },
);
