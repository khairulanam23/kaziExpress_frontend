"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  reportsService,
  type AttendanceReportParams,
  type DateRangeParams,
  type InventoryReportParams,
  type PayrollReportParams,
  type ProductionReportParams,
  type StockMovementReportParams,
} from "@/services/reports.service";

const REPORTS_KEY = ["reports"] as const;

export function useInventoryReport(params?: InventoryReportParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...REPORTS_KEY, "inventory", params ?? {}],
    queryFn: () => reportsService.inventory(params),
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useStockMovementReport(params?: StockMovementReportParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...REPORTS_KEY, "stock-movements", params ?? {}],
    queryFn: () => reportsService.stockMovements(params),
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useProductionReport(params?: ProductionReportParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...REPORTS_KEY, "production", params ?? {}],
    queryFn: () => reportsService.production(params),
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useAttendanceReport(params?: AttendanceReportParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...REPORTS_KEY, "attendance", params ?? {}],
    queryFn: () => reportsService.attendance(params),
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function usePayrollReport(params?: PayrollReportParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...REPORTS_KEY, "payroll", params ?? {}],
    queryFn: () => reportsService.payroll(params),
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useEmployeePerformanceReport(
  employeeId: string | null,
  params?: DateRangeParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...REPORTS_KEY, "employee-performance", employeeId, params ?? {}],
    queryFn: () => reportsService.employeePerformance(employeeId as string, params),
    enabled: !!employeeId && (options?.enabled ?? true),
  });
}

/**
 * Wraps any PDF/CSV download in a mutation so pages get `isPending` for the
 * button spinner and `onError` for the toast, without bespoke state each time.
 */
export function useReportDownload<TArgs = void>(download: (args: TArgs) => Promise<void>) {
  return useMutation({ mutationFn: download });
}
