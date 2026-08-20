import { apiClient, downloadFile, type ApiEnvelope } from "@/lib/api-client";
import type { EarningsBreakdown, PayCalculationMode, PerformanceSummary, Role, User } from "@/types";

export interface UserListParams {
  search?: string;
  searchKey?: string;
  role?: Role;
  isActive?: boolean;
  pageNo?: number;
  showPerPage?: number;
}

export interface UserListResponse {
  users: User[];
  totalData: number;
  totalPages: number;
}

export interface EmployeeProfilePayload {
  hourlyRate: number;
  dailyRate?: number;
  payCalculationMode?: PayCalculationMode;
  overtimeMultiplier?: number;
  lateGraceMinutes?: number;
  earlyLeavePenalty?: boolean;
  department?: string;
  joinDate?: string;
}

export interface CreateEmployeePayload {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
  role?: Role;
  profile?: EmployeeProfilePayload;
}

export interface UpdateEmployeePayload {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  address?: string;
  role?: Role;
  isActive?: boolean;
  profile?: Partial<EmployeeProfilePayload>;
}

/** `isActive` is validated as the literal string "true"/"false" by the backend. */
function normalizeParams(params: UserListParams) {
  const out: Record<string, unknown> = { ...params };
  if (params.isActive === undefined) delete out.isActive;
  else out.isActive = params.isActive ? "true" : "false";
  return out;
}

export const usersService = {
  /** GET /users — admin only. */
  list: async (params: UserListParams) => {
    const { data } = await apiClient.get<ApiEnvelope<UserListResponse>>("/users", { params: normalizeParams(params) });
    return data.data as UserListResponse;
  },

  /** GET /users/:id — admin, or the user themselves. */
  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiEnvelope<User>>(`/users/${id}`);
    return data.data as User;
  },

  /** POST /users — admin only. */
  create: async (payload: CreateEmployeePayload) => {
    const { data } = await apiClient.post<ApiEnvelope<User>>("/users", payload);
    return data.data as User;
  },

  /** PATCH /users/:id — admin only. */
  update: async (id: string, payload: UpdateEmployeePayload) => {
    const { data } = await apiClient.patch<ApiEnvelope<User>>(`/users/${id}`, payload);
    return data.data as User;
  },

  /** DELETE /users/:id — soft delete (deactivate); admin only. */
  deactivate: async (id: string) => {
    await apiClient.delete(`/users/${id}`);
  },

  /** GET /users/me */
  me: async () => {
    const { data } = await apiClient.get<ApiEnvelope<User>>("/users/me");
    return data.data as User;
  },

  /** PATCH /users/me — self-service; email/role/isActive are deliberately not editable. */
  updateMe: async (payload: { name?: string; address?: string; phone?: string }) => {
    const { data } = await apiClient.patch<ApiEnvelope<User>>("/users/me", payload);
    return data.data as User;
  },

  /** GET /users/me/earnings */
  myEarnings: async (params?: { from?: string; to?: string }) => {
    const { data } = await apiClient.get<ApiEnvelope<EarningsBreakdown>>("/users/me/earnings", { params });
    return data.data as EarningsBreakdown;
  },

  /** GET /users/:id/performance — admin, or the user themselves. */
  performance: async (id: string, params?: { year?: number; month?: number }) => {
    const { data } = await apiClient.get<ApiEnvelope<PerformanceSummary>>(`/users/${id}/performance`, { params });
    return data.data as PerformanceSummary;
  },

  /** GET /users/:id/report — monthly PDF; defaults to the previous calendar month. */
  downloadReport: (id: string, params?: { year?: number; month?: number }, employeeName?: string) =>
    downloadFile(
      `/users/${id}/report`,
      `employee-report-${(employeeName ?? id.slice(0, 8)).replace(/\s+/g, "-").toLowerCase()}.pdf`,
      params,
    ),
};
