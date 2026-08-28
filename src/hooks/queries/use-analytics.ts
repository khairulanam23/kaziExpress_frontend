"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsService, type DateRangeParams } from "@/services/reports.service";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * The analytical reports. Each is gated on the permission its endpoint
 * enforces, so a user without it never fires a request that would 403 —
 * the guard is the server's; this only avoids the pointless round trip.
 */

export function useWasteReport(params?: DateRangeParams & { productId?: string }, enabled = true) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: ["reports", "waste", params ?? {}],
    queryFn: () => analyticsService.waste(params),
    enabled: enabled && has("REPORT_STOCK_MOVEMENTS"),
  });
}

export function useReorderReport(params?: { lookbackDays?: number; horizonDays?: number }, enabled = true) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: ["reports", "reorder", params ?? {}],
    queryFn: () => analyticsService.reorder(params),
    enabled: enabled && has("REPORT_INVENTORY"),
  });
}

export function useProductionCostReport(params?: DateRangeParams & { productId?: string }, enabled = true) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: ["reports", "production-cost", params ?? {}],
    queryFn: () => analyticsService.productionCost(params),
    enabled: enabled && has("REPORT_PRODUCTION"),
  });
}

export function useValuationReport(params?: { categoryId?: string }, enabled = true) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: ["reports", "valuation", params ?? {}],
    queryFn: () => analyticsService.valuation(params),
    enabled: enabled && has("REPORT_INVENTORY"),
  });
}

export function useLabourEfficiencyReport(params?: DateRangeParams, enabled = true) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: ["reports", "labour-efficiency", params ?? {}],
    queryFn: () => analyticsService.labourEfficiency(params),
    enabled: enabled && has("REPORT_PRODUCTION"),
  });
}

export function useVendorPerformanceReport(params?: DateRangeParams & { vendorId?: string }, enabled = true) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: ["reports", "vendor-performance", params ?? {}],
    queryFn: () => analyticsService.vendorPerformance(params),
    enabled: enabled && has("REPORT_INVENTORY"),
  });
}

/** Batch genealogy — only fetched once a batch is actually selected. */
export function useBatchTrace(batchId: string | null) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: ["inventory", "trace", batchId],
    queryFn: () => analyticsService.batchTrace(batchId as string),
    enabled: !!batchId && has("INVENTORY_MANAGE_BATCHES"),
  });
}
