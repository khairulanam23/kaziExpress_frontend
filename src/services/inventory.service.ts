import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { InventoryBatch, Product, StockMovement, StockMovementType } from "@/types";

export interface MovementListParams {
  productId?: string;
  type?: StockMovementType;
  batchId?: string;
  /** YYYY-MM-DD */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
  pageNo?: number;
  showPerPage?: number;
}

export interface MovementListResponse {
  movements: StockMovement[];
  totalData: number;
  totalPages: number;
  currentPage: number;
}

export interface StockChangeResult {
  product: Product;
  batch: InventoryBatch | null;
  movement: StockMovement | null;
}

export const inventoryService = {
  /** GET /inventory/batches — every batch, or just one product's. */
  batches: async (productId?: string) => {
    const { data } = await apiClient.get<ApiEnvelope<InventoryBatch[]>>("/inventory/batches", {
      params: productId ? { productId } : undefined,
    });
    return data.data ?? [];
  },

  /** GET /inventory/movements */
  movements: async (params?: MovementListParams) => {
    const { data } = await apiClient.get<ApiEnvelope<MovementListResponse>>("/inventory/movements", { params });
    return data.data as MovementListResponse;
  },

  /** POST /inventory/add — admin only; always opens a new batch. */
  addStock: async (payload: { productId: string; quantity: number; unitCost?: number; notes?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<StockChangeResult>>("/inventory/add", payload);
    return data.data as StockChangeResult;
  },

  /**
   * POST /inventory/adjust — admin only. Send either an absolute `newQuantity`
   * or a signed `quantityDifference`; a reason is mandatory for the audit trail.
   */
  adjustStock: async (payload: {
    productId: string;
    newQuantity?: number;
    quantityDifference?: number;
    batchId?: string;
    reason: string;
  }) => {
    const { data } = await apiClient.post<ApiEnvelope<StockChangeResult>>("/inventory/adjust", payload);
    return data.data as StockChangeResult;
  },
};

export interface StockMovementListParams {
  productId?: string;
  type?: Exclude<StockMovementType, "TASK_RESERVATION" | "TASK_RELEASE" | "DAMAGE" | "REFILL">;
  taskId?: string;
  from?: string;
  to?: string;
  pageNo?: number;
  showPerPage?: number;
}

export const stockMovementsService = {
  /** GET /stock-movements */
  list: async (params?: StockMovementListParams) => {
    const { data } = await apiClient.get<ApiEnvelope<{ movements: StockMovement[]; totalData: number; totalPages: number }>>(
      "/stock-movements",
      { params },
    );
    return data.data as { movements: StockMovement[]; totalData: number; totalPages: number };
  },

  /** GET /stock-movements/product/:productId — full history for one item. */
  forProduct: async (productId: string) => {
    const { data } = await apiClient.get<ApiEnvelope<StockMovement[]>>(`/stock-movements/product/${productId}`);
    return data.data ?? [];
  },

  /** POST /stock-movements — manual purchase/adjustment/write-off/return entry. */
  create: async (payload: {
    productId: string;
    type: "PURCHASE" | "ADJUSTMENT" | "WRITE_OFF" | "RETURN";
    quantity: number;
    unitCost: number;
    notes?: string;
  }) => {
    const { data } = await apiClient.post<ApiEnvelope<StockMovement>>("/stock-movements", payload);
    return data.data as StockMovement;
  },

  /** POST /stock-movements/consume */
  consume: async (payload: { productId: string; quantity: number; relatedTaskId?: string; notes?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<unknown>>("/stock-movements/consume", payload);
    return data.data;
  },

  /** POST /stock-movements/assemble — builds a composite product from its BOM. */
  assemble: async (payload: { productId: string; quantity: number; notes?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<unknown>>("/stock-movements/assemble", payload);
    return data.data;
  },
};
