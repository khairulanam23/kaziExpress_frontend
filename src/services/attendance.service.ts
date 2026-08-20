import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { Attendance, OvertimeMonthlyReport, OvertimeStatus, TodayStatus } from "@/types";

export interface AttendanceListParams {
  employeeId?: string;
  /** YYYY-MM-DD */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
  year?: string;
  month?: string;
  overtimeStatus?: OvertimeStatus;
  pageNo?: number;
  showPerPage?: number;
}

export interface AttendanceListResponse {
  records: Attendance[];
  totalData: number;
  totalPages: number;
  currentPage: number;
}

export const attendanceService = {
  /** POST /attendance/check-in — idempotent; returns today's record if already open. */
  checkIn: async (payload?: { source?: "FINGERPRINT" | "MANUAL" | "WEB"; timestamp?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<Attendance>>("/attendance/check-in", payload ?? {});
    return data.data as Attendance;
  },

  /** POST /attendance/check-out — computes worked hours and raw overtime. */
  checkOut: async (payload?: { source?: "FINGERPRINT" | "MANUAL" | "WEB"; timestamp?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<Attendance>>("/attendance/check-out", payload ?? {});
    return data.data as Attendance;
  },

  /** GET /attendance/me/today */
  today: async () => {
    const { data } = await apiClient.get<ApiEnvelope<TodayStatus>>("/attendance/me/today");
    return data.data as TodayStatus;
  },

  /** GET /attendance — admin sees everyone, employee is scoped to self server-side. */
  list: async (params?: AttendanceListParams) => {
    const { data } = await apiClient.get<ApiEnvelope<AttendanceListResponse>>("/attendance", { params });
    return data.data as AttendanceListResponse;
  },

  /** PATCH /attendance/:id/overtime — admin approves, rejects, or edits overtime hours. */
  decideOvertime: async (
    id: string,
    payload: { status?: OvertimeStatus; adminOvertimeHours?: number; reason?: string },
  ) => {
    const { data } = await apiClient.patch<ApiEnvelope<Attendance>>(`/attendance/${id}/overtime`, payload);
    return data.data as Attendance;
  },

  /** PATCH /attendance/:id/override — admin corrects punch times; reason is mandatory. */
  override: async (
    id: string,
    payload: { checkIn?: string; checkOut?: string; reason: string; notes?: string },
  ) => {
    const { data } = await apiClient.patch<ApiEnvelope<Attendance>>(`/attendance/${id}/override`, payload);
    return data.data as Attendance;
  },

  /** GET /attendance/overtime/monthly — admin only. */
  monthlyOvertime: async (year: number, month: number) => {
    const { data } = await apiClient.get<ApiEnvelope<OvertimeMonthlyReport>>("/attendance/overtime/monthly", {
      params: { year, month },
    });
    return data.data as OvertimeMonthlyReport;
  },

  /** GET /attendance/config/required-hours */
  getRequiredHours: async () => {
    const { data } = await apiClient.get<ApiEnvelope<{ requiredWorkingHours: number }>>("/attendance/config/required-hours");
    return data.data?.requiredWorkingHours ?? 8;
  },

  /** PUT /attendance/config/required-hours — admin only. */
  setRequiredHours: async (requiredWorkingHours: number) => {
    const { data } = await apiClient.put<ApiEnvelope<unknown>>("/attendance/config/required-hours", { requiredWorkingHours });
    return data.data;
  },
};
