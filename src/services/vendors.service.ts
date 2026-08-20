import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { Vendor } from "@/types";

export interface VendorListParams {
  searchKey?: string;
  pageNo?: number;
  showPerPage?: number;
}

export interface VendorPayload {
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export const vendorsService = {
  /** GET /vendors */
  list: async (params?: VendorListParams) => {
    const { data } = await apiClient.get<ApiEnvelope<{ vendors: Vendor[]; totalData: number; totalPages: number }>>(
      "/vendors",
      { params },
    );
    return data.data as { vendors: Vendor[]; totalData: number; totalPages: number };
  },

  /** GET /vendors/:id */
  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiEnvelope<Vendor>>(`/vendors/${id}`);
    return data.data as Vendor;
  },

  /** POST /vendors */
  create: async (payload: VendorPayload) => {
    const { data } = await apiClient.post<ApiEnvelope<Vendor>>("/vendors", payload);
    return data.data as Vendor;
  },

  /** PATCH /vendors/:id */
  update: async (id: string, payload: Partial<VendorPayload>) => {
    const { data } = await apiClient.patch<ApiEnvelope<Vendor>>(`/vendors/${id}`, payload);
    return data.data as Vendor;
  },

  /** DELETE /vendors/:id */
  remove: async (id: string) => {
    await apiClient.delete(`/vendors/${id}`);
  },
};
