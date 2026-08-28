import { apiClient, downloadFile, type ApiEnvelope } from "@/lib/api-client";
import type {
  AttendanceReport,
  BatchTrace,
  LabourEfficiencyReport,
  ProductionCostReport,
  ReorderReport,
  ValuationReport,
  VendorPerformanceReport,
  WasteReport,
  EmployeePerformanceReport,
  InventoryReport,
  ItemType,
  PayrollReport,
  ProductionReport,
  StockMovementReport,
  TaskStatus,
} from "@/types";

const stamp = () => new Date().toISOString().slice(0, 10);

export interface InventoryReportParams {
  itemType?: ItemType;
  categoryId?: string;
  vendorId?: string;
  status?: "ACTIVE" | "DISCONTINUED" | "ALL";
}

export interface StockMovementReportParams {
  from?: string;
  to?: string;
  productId?: string;
  type?: string;
  performedById?: string;
  taskId?: string;
  batchId?: string;
  page?: number;
  limit?: number;
}

export interface ProductionReportParams {
  from?: string;
  to?: string;
  employeeId?: string;
  productId?: string;
  status?: TaskStatus;
}

export interface AttendanceReportParams {
  from?: string;
  to?: string;
  employeeId?: string;
}

export interface PayrollReportParams {
  year?: number;
  month?: number;
  employeeId?: string;
}

export interface DateRangeParams {
  from?: string;
  to?: string;
}

/**
 * Reports module. Inventory/stock-movement/payroll reports are admin-only
 * server-side; production, attendance and employee-performance reports are
 * automatically scoped to the caller when they are an employee.
 */
export const reportsService = {
  /** GET /reports/inventory — valuation, category & vendor breakdown. */
  inventory: async (params?: InventoryReportParams) => {
    const { data } = await apiClient.get<ApiEnvelope<InventoryReport>>("/reports/inventory", { params });
    return data.data as InventoryReport;
  },
  downloadInventoryPdf: (params?: InventoryReportParams) =>
    downloadFile("/reports/inventory/pdf", `inventory-report-${stamp()}.pdf`, params),

  /** GET /reports/stock-movements — paginated audit trail. */
  stockMovements: async (params?: StockMovementReportParams) => {
    const { data } = await apiClient.get<ApiEnvelope<StockMovementReport>>("/reports/stock-movements", { params });
    return data.data as StockMovementReport;
  },
  downloadStockMovementsPdf: (params?: StockMovementReportParams) =>
    downloadFile("/reports/stock-movements/pdf", `stock-movements-${stamp()}.pdf`, params),
  exportStockMovementsCsv: (params?: StockMovementReportParams) =>
    downloadFile("/reports/stock-movements/export", `stock-movements-${stamp()}.csv`, params),

  /** GET /reports/production */
  production: async (params?: ProductionReportParams) => {
    const { data } = await apiClient.get<ApiEnvelope<ProductionReport>>("/reports/production", { params });
    return data.data as ProductionReport;
  },
  downloadProductionPdf: (params?: ProductionReportParams) =>
    downloadFile("/reports/production/pdf", `production-report-${stamp()}.pdf`, params),
  exportProductionCsv: (params?: ProductionReportParams) =>
    downloadFile("/reports/production/export", `production-report-${stamp()}.csv`, params),

  /** GET /reports/attendance */
  attendance: async (params?: AttendanceReportParams) => {
    const { data } = await apiClient.get<ApiEnvelope<AttendanceReport>>("/reports/attendance", { params });
    return data.data as AttendanceReport;
  },
  downloadAttendancePdf: (params?: AttendanceReportParams) =>
    downloadFile("/reports/attendance/pdf", `attendance-report-${stamp()}.pdf`, params),
  exportAttendanceCsv: (params?: AttendanceReportParams) =>
    downloadFile("/reports/attendance/export", `attendance-report-${stamp()}.csv`, params),

  /** GET /reports/payroll — admin only. */
  payroll: async (params?: PayrollReportParams) => {
    const { data } = await apiClient.get<ApiEnvelope<PayrollReport>>("/reports/payroll", { params });
    return data.data as PayrollReport;
  },
  downloadPayrollPdf: (params?: PayrollReportParams) =>
    downloadFile("/reports/payroll/pdf", `payroll-report-${stamp()}.pdf`, params),
  exportPayrollCsv: (params?: PayrollReportParams) =>
    downloadFile("/reports/payroll/export", `payroll-report-${stamp()}.csv`, params),

  /** GET /reports/employee-performance/:id — employees may only request their own id. */
  employeePerformance: async (employeeId: string, params?: DateRangeParams) => {
    const { data } = await apiClient.get<ApiEnvelope<EmployeePerformanceReport>>(
      `/reports/employee-performance/${employeeId}`,
      { params },
    );
    return data.data as EmployeePerformanceReport;
  },
  downloadEmployeePerformancePdf: (employeeId: string, params?: DateRangeParams) =>
    downloadFile(`/reports/employee-performance/${employeeId}/pdf`, `employee-performance-${stamp()}.pdf`, params),
};

// ── Analytical reports (roadmap items 4, 5, 7, 11, 12, 13) ─────────────────

export interface DateRangeParams {
  from?: string;
  to?: string;
}

export const analyticsService = {
  /** GET /reports/waste — what was destroyed, what it cost, and where. */
  waste: async (params?: DateRangeParams & { productId?: string }) => {
    const { data } = await apiClient.get<ApiEnvelope<WasteReport>>("/reports/waste", { params });
    return data.data;
  },

  /** GET /reports/reorder — consumption rate against vendor lead time. */
  reorder: async (params?: { lookbackDays?: number; horizonDays?: number }) => {
    const { data } = await apiClient.get<ApiEnvelope<ReorderReport>>("/reports/reorder", { params });
    return data.data;
  },

  /** GET /reports/production-cost — actual material plus attributed labour. */
  productionCost: async (params?: DateRangeParams & { productId?: string }) => {
    const { data } = await apiClient.get<ApiEnvelope<ProductionCostReport>>("/reports/production-cost", { params });
    return data.data;
  },

  /** GET /reports/valuation — stock on hand at acquisition cost. */
  valuation: async (params?: { categoryId?: string }) => {
    const { data } = await apiClient.get<ApiEnvelope<ValuationReport>>("/reports/valuation", { params });
    return data.data;
  },

  /** GET /reports/labour-efficiency — output per hour and schedule adherence. */
  labourEfficiency: async (params?: DateRangeParams) => {
    const { data } = await apiClient.get<ApiEnvelope<LabourEfficiencyReport>>("/reports/labour-efficiency", { params });
    return data.data;
  },

  /** GET /reports/vendor-performance — purchase price history and drift. */
  vendorPerformance: async (params?: DateRangeParams & { vendorId?: string }) => {
    const { data } = await apiClient.get<ApiEnvelope<VendorPerformanceReport>>("/reports/vendor-performance", { params });
    return data.data;
  },

  /** GET /inventory/batches/:id/trace — batch genealogy and recall list. */
  batchTrace: async (batchId: string) => {
    const { data } = await apiClient.get<ApiEnvelope<BatchTrace>>(`/inventory/batches/${batchId}/trace`);
    return data.data;
  },
};
