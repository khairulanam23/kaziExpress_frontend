"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService, type DashboardParams } from "@/services/dashboard.service";
import { useAuthStore } from "@/store/auth-store";
import type { AdminDashboardOverview, EmployeeDashboardOverview } from "@/types";

/** GET /dashboard/overview — the payload shape follows the caller's role. */
export function useDashboardOverview(params?: DashboardParams) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["dashboard", "overview", params ?? {}],
    queryFn: () => dashboardService.overview(params),
    enabled: isAuthenticated,
    placeholderData: (prev) => prev,
  });
}

export function useAdminDashboard(params?: DashboardParams) {
  const query = useDashboardOverview(params);
  return { ...query, data: query.data as AdminDashboardOverview | undefined };
}

export function useEmployeeDashboard(params?: DashboardParams) {
  const query = useDashboardOverview(params);
  return { ...query, data: query.data as EmployeeDashboardOverview | undefined };
}
