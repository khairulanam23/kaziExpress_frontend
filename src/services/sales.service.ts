import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  Customer,
  CustomerType,
  Disposition,
  DispositionListResponse,
  DispositionType,
  FinishedGoodsBatchDetail,
  FinishedGoodsResponse,
  ProfitReport,
} from "@/types";

export interface FinishedGoodsParams {
  search?: string;
  productId?: string;
  status?: "UNSOLD" | "PARTLY_SOLD" | "FULLY_DISPOSED" | "ALL";
}

export interface CreateDispositionPayload {
  type: DispositionType;
  quantity: number;
  customerId?: string | null;
  unitSellingPrice?: number;
  reason?: string | null;
  notes?: string | null;
}

export interface CustomerPayload {
  name: string;
  type?: CustomerType;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export const salesService = {
  /** GET /sales/finished-goods — manufactured batches and their disposal status. */
  finishedGoods: async (params?: FinishedGoodsParams) => {
    const { data } = await apiClient.get<ApiEnvelope<FinishedGoodsResponse>>("/sales/finished-goods", { params });
    return data.data;
  },

  /** GET /sales/finished-goods/:id — one batch, its cost breakdown and history. */
  finishedGoodsBatch: async (batchId: string) => {
    const { data } = await apiClient.get<ApiEnvelope<FinishedGoodsBatchDetail>>(`/sales/finished-goods/${batchId}`);
    return data.data;
  },

  /** POST /sales/finished-goods/:id/dispositions — sell, transfer or write off. */
  createDisposition: async (batchId: string, payload: CreateDispositionPayload) => {
    const { data } = await apiClient.post<ApiEnvelope<Disposition>>(
      `/sales/finished-goods/${batchId}/dispositions`,
      payload,
    );
    return data.data;
  },

  /** POST /sales/dispositions/:id/reverse — undo one and return the stock. */
  reverseDisposition: async (dispositionId: string, reason: string) => {
    const { data } = await apiClient.post<ApiEnvelope<Disposition>>(
      `/sales/dispositions/${dispositionId}/reverse`,
      { reason },
    );
    return data.data;
  },

  /** GET /sales/dispositions — disposition history. */
  dispositions: async (params?: {
    from?: string; to?: string; type?: DispositionType; customerId?: string;
    productId?: string; includeReversed?: boolean; showPerPage?: number; pageNo?: number;
  }) => {
    const { data } = await apiClient.get<ApiEnvelope<DispositionListResponse>>("/sales/dispositions", { params });
    return data.data;
  },

  /** PATCH /sales/products/:id/selling-price — set the default offered price. */
  setSellingPrice: async (productId: string, sellingPrice: number | null) => {
    const { data } = await apiClient.patch<ApiEnvelope<{ id: string; sellingPrice: number | null }>>(
      `/sales/products/${productId}/selling-price`,
      { sellingPrice },
    );
    return data.data;
  },

  /** GET /sales/profit — revenue, COGS and gross profit. */
  profit: async (params?: {
    from?: string; to?: string; productId?: string; customerId?: string; includeStoreTransfers?: boolean;
  }) => {
    const { data } = await apiClient.get<ApiEnvelope<ProfitReport>>("/sales/profit", { params });
    return data.data;
  },
};

export const customerService = {
  list: async (params?: { search?: string; type?: CustomerType; includeInactive?: boolean }) => {
    const { data } = await apiClient.get<ApiEnvelope<{ customers: Customer[]; totalData: number }>>("/customers", { params });
    return data.data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get<ApiEnvelope<Customer>>(`/customers/${id}`);
    return data.data;
  },
  create: async (payload: CustomerPayload) => {
    const { data } = await apiClient.post<ApiEnvelope<Customer>>("/customers", payload);
    return data.data;
  },
  update: async (id: string, payload: CustomerPayload) => {
    const { data } = await apiClient.patch<ApiEnvelope<Customer>>(`/customers/${id}`, payload);
    return data.data;
  },
  remove: async (id: string) => {
    const { data } = await apiClient.delete<ApiEnvelope<Customer>>(`/customers/${id}`);
    return data.data;
  },
};
