"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { payrollService, type PayrollPeriod } from "@/services/payroll.service";
import { useAuthStore } from "@/store/auth-store";

const PAYROLL_KEY = ["payroll"] as const;

export function useMyPayroll(period?: Partial<PayrollPeriod>) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...PAYROLL_KEY, "me", period ?? {}],
    queryFn: () => payrollService.mySummary(period),
    enabled: isAuthenticated,
    placeholderData: (prev) => prev,
  });
}

export function useEmployeePayroll(employeeId: string | null, period?: Partial<PayrollPeriod>) {
  return useQuery({
    queryKey: [...PAYROLL_KEY, "employee", employeeId, period ?? {}],
    queryFn: () => payrollService.employeeSummary(employeeId as string, period),
    enabled: !!employeeId,
    placeholderData: (prev) => prev,
  });
}

export function usePayrollOverview(period?: Partial<PayrollPeriod>, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...PAYROLL_KEY, "overview", period ?? {}],
    queryFn: () => payrollService.overview(period),
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useSalaryPayments(params?: { employeeId?: string; year?: number; month?: number }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...PAYROLL_KEY, "payments", params ?? {}],
    queryFn: () => payrollService.payments(params),
    enabled: isAuthenticated,
  });
}

export function useCreateSalaryPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof payrollService.createPayment>[0]) => payrollService.createPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdateHourlyRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, hourlyRate }: { employeeId: string; hourlyRate: number }) =>
      payrollService.updateHourlyRate(employeeId, hourlyRate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEY });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
