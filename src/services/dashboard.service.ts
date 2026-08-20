import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { DashboardOverview } from "@/types";

export interface DashboardParams {
  /** YYYY-MM-DD */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
}

export const dashboardService = {
  /**
   * GET /dashboard/overview — the backend branches on the caller's role and
   * returns either the admin or the employee shape.
   */
  overview: async (params?: DashboardParams) => {
    const { data } = await apiClient.get<ApiEnvelope<DashboardOverview>>("/dashboard/overview", { params });
    return data.data as DashboardOverview;
  },
};
