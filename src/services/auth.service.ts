import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { User } from "@/types";

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  /** POST /auth/login */
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post<ApiEnvelope<LoginResult>>("/auth/login", { email, password });
    return data.data as LoginResult;
  },

  /** POST /auth/register — self-service signup (backend defaults new accounts to ADMIN). */
  register: async (payload: { email: string; password: string; name?: string; phone?: string; role?: "ADMIN" | "EMPLOYEE" }) => {
    const { data } = await apiClient.post<ApiEnvelope<User>>("/auth/register", payload);
    return data.data as User;
  },

  /** POST /auth/refresh */
  refresh: async (refreshToken: string) => {
    const { data } = await apiClient.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>("/auth/refresh", { refreshToken });
    return data.data as { accessToken: string; refreshToken: string };
  },

  /** POST /auth/logout */
  logout: async () => {
    await apiClient.post("/auth/logout", {});
  },

  /** GET /auth/me */
  me: async () => {
    const { data } = await apiClient.get<ApiEnvelope<User>>("/auth/me");
    return data.data as User;
  },

  /** POST /auth/change-password */
  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    await apiClient.post("/auth/change-password", payload);
  },

  /** POST /auth/forgot-password */
  forgotPassword: async (email: string) => {
    await apiClient.post("/auth/forgot-password", { email });
  },

  /** POST /auth/reset-password */
  resetPassword: async (payload: { token: string; password: string }) => {
    await apiClient.post("/auth/reset-password", payload);
  },
};
