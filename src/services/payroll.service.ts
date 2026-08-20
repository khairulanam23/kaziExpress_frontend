import { apiClient, downloadFile, type ApiEnvelope } from "@/lib/api-client";
import type { EmployeeProfile, PayrollOverview, PayrollSummary, SalaryPayment } from "@/types";

export interface PayrollPeriod {
  year: number;
  month: number;
}

export const payrollService = {
  /** GET /payroll/me — the signed-in employee's own monthly summary. */
  mySummary: async (period?: Partial<PayrollPeriod>) => {
    const { data } = await apiClient.get<ApiEnvelope<PayrollSummary>>("/payroll/me", { params: period });
    return data.data as PayrollSummary;
  },

  /** GET /payroll/employees/:id — admin only. */
  employeeSummary: async (employeeId: string, period?: Partial<PayrollPeriod>) => {
    const { data } = await apiClient.get<ApiEnvelope<PayrollSummary>>(`/payroll/employees/${employeeId}`, { params: period });
    return data.data as PayrollSummary;
  },

  /** GET /payroll/overview — admin only; every active employee for a billing month. */
  overview: async (period?: Partial<PayrollPeriod>) => {
    const { data } = await apiClient.get<ApiEnvelope<PayrollOverview>>("/payroll/overview", { params: period });
    return data.data as PayrollOverview;
  },

  /** GET /payroll/payments — admin may filter by employee; employees always see only their own. */
  payments: async (params?: { employeeId?: string; year?: number; month?: number }) => {
    const { data } = await apiClient.get<ApiEnvelope<SalaryPayment[]>>("/payroll/payments", { params });
    return data.data ?? [];
  },

  /**
   * POST /payroll/payments — admin only. The backend rejects any amount above
   * the remaining unpaid balance, so the UI validates against the same figure.
   */
  createPayment: async (payload: { employeeId: string; year: number; month: number; amount: number; note?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<{ payment: SalaryPayment; summary: PayrollSummary }>>(
      "/payroll/payments",
      payload,
    );
    return data.data as { payment: SalaryPayment; summary: PayrollSummary };
  },

  /** PUT /payroll/employees/:id/rate — admin only; locked months keep their snapshot rate. */
  updateHourlyRate: async (employeeId: string, hourlyRate: number) => {
    const { data } = await apiClient.put<ApiEnvelope<EmployeeProfile>>(`/payroll/employees/${employeeId}/rate`, { hourlyRate });
    return data.data as EmployeeProfile;
  },

  /** GET /payroll/me/statement/pdf */
  downloadMyStatement: (period: PayrollPeriod) =>
    downloadFile("/payroll/me/statement/pdf", `payroll-statement-${period.year}-${String(period.month).padStart(2, "0")}.pdf`, period),

  /** GET /payroll/employees/:id/statement/pdf — admin only. */
  downloadEmployeeStatement: (employeeId: string, period: PayrollPeriod, employeeName?: string) =>
    downloadFile(
      `/payroll/employees/${employeeId}/statement/pdf`,
      `payroll-statement-${(employeeName ?? employeeId).replace(/\s+/g, "-").toLowerCase()}-${period.year}-${String(period.month).padStart(2, "0")}.pdf`,
      period,
    ),
};
