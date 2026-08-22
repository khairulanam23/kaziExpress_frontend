import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { EmployeePermissions, PermissionCatalog } from "@/types";

export const permissionsService = {
  /** GET /permissions — full catalogue, category grouping, presets and defaults. */
  catalog: async () => {
    const { data } = await apiClient.get<ApiEnvelope<PermissionCatalog>>("/permissions");
    return data.data as PermissionCatalog;
  },

  /** GET /permissions/employees/:id */
  forEmployee: async (userId: string) => {
    const { data } = await apiClient.get<ApiEnvelope<EmployeePermissions>>(`/permissions/employees/${userId}`);
    return data.data as EmployeePermissions;
  },

  /**
   * PUT /permissions/employees/:id — replaces the explicit grant list.
   *
   * Default employee permissions are implicit and not part of this payload;
   * sending only the explicit additions is what the backend expects.
   */
  replace: async (userId: string, permissions: string[]) => {
    const { data } = await apiClient.put<ApiEnvelope<EmployeePermissions>>(
      `/permissions/employees/${userId}`,
      { permissions },
    );
    return data.data as EmployeePermissions;
  },

  /** POST /permissions/employees/:id — adds to the existing grants. */
  add: async (userId: string, permissions: string[]) => {
    const { data } = await apiClient.post<ApiEnvelope<EmployeePermissions>>(
      `/permissions/employees/${userId}`,
      { permissions },
    );
    return data.data as EmployeePermissions;
  },

  /** DELETE /permissions/employees/:id/:permissionKey */
  remove: async (userId: string, permissionKey: string) => {
    const { data } = await apiClient.delete<ApiEnvelope<EmployeePermissions>>(
      `/permissions/employees/${userId}/${permissionKey}`,
    );
    return data.data as EmployeePermissions;
  },
};
