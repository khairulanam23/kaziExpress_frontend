import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { BOMPreview, ProductRequest, ProductRequestStatus, ProductRequestType } from "@/types";

export interface ProductRequestListParams {
  status?: ProductRequestStatus;
  type?: ProductRequestType;
  taskId?: string;
  requestedBy?: string;
  pageNo?: number;
  showPerPage?: number;
}

export interface ProductRequestListResponse {
  requests: ProductRequest[];
  totalData: number;
  totalPages: number;
}

export const productRequestsService = {
  /** GET /product-requests — employees only ever see their own. */
  list: async (params?: ProductRequestListParams) => {
    const { data } = await apiClient.get<ApiEnvelope<ProductRequestListResponse>>("/product-requests", { params });
    return data.data as ProductRequestListResponse;
  },

  /** GET /product-requests/:id */
  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiEnvelope<ProductRequest>>(`/product-requests/${id}`);
    return data.data as ProductRequest;
  },

  /** POST /product-requests — employee only; TASK_RELATED requests require a taskId. */
  create: async (payload: {
    productId: string;
    quantity: number;
    type: ProductRequestType;
    taskId?: string;
    reason?: string;
  }) => {
    const { data } = await apiClient.post<ApiEnvelope<ProductRequest>>("/product-requests", payload);
    return data.data as ProductRequest;
  },

  /** PATCH /product-requests/:id — admin only; rejection requires a reason. */
  decide: async (id: string, payload: { status: "APPROVED" | "REJECTED"; rejectionReason?: string }) => {
    const { data } = await apiClient.patch<ApiEnvelope<ProductRequest>>(`/product-requests/${id}`, payload);
    return data.data as ProductRequest;
  },

  /** POST /product-requests/:id/issue — admin only; moves the approved stock out. */
  issue: async (id: string) => {
    const { data } = await apiClient.post<ApiEnvelope<unknown>>(`/product-requests/${id}/issue`);
    return data.data;
  },

  /** GET /product-requests/bom-preview — expands a composite product into components. */
  bomPreview: async (productId: string, quantity: number) => {
    const { data } = await apiClient.get<ApiEnvelope<BOMPreview>>("/product-requests/bom-preview", {
      params: { productId, quantity },
    });
    return data.data as BOMPreview;
  },
};
