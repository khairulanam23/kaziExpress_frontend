import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { SystemConfigMap } from "@/types";

/** Keys the backend documents defaults for, surfaced in the settings UI. */
export const CONFIG_KEYS = {
  negativeStockMaxDays: "negative_stock_max_days",
  defaultPayCalculationMode: "default_pay_calculation_mode",
  defaultLateGraceMinutes: "default_late_grace_minutes",
  defaultOvertimeMultiplier: "default_overtime_multiplier",
  lowStockAlertEnabled: "low_stock_alert_enabled",
  autoGenerateMonthlyReport: "auto_generate_monthly_report",
  requiredWorkingHours: "required_working_hours",
  overtimeMultiplier: "overtime_multiplier",
} as const;

export const configService = {
  /** GET /config — every key, with documented defaults merged in. */
  getAll: async () => {
    const { data } = await apiClient.get<ApiEnvelope<SystemConfigMap>>("/config");
    return (data.data ?? {}) as SystemConfigMap;
  },

  /** GET /config/:key */
  getByKey: async (key: string) => {
    const { data } = await apiClient.get<ApiEnvelope<{ key: string; value: unknown }>>(`/config/${key}`);
    return data.data as { key: string; value: unknown };
  },

  /** PATCH /config — upserts one or more keys in a single transaction. */
  update: async (updates: Record<string, unknown>) => {
    const { data } = await apiClient.patch<ApiEnvelope<SystemConfigMap>>("/config", updates);
    return (data.data ?? {}) as SystemConfigMap;
  },
};
