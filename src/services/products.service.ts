import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { BOMTreeNode, ItemType, Product, ProductCostResult } from "@/types";

export interface ProductListParams {
  search?: string;
  itemType?: ItemType;
  lowStock?: boolean;
  isDiscontinued?: boolean;
  isComposite?: boolean;
  category?: string;
  categoryId?: string;
  vendorId?: string;
  pageNo?: number;
  showPerPage?: number;
}

export interface ProductListResponse {
  products: Product[];
  totalData: number;
  totalPages: number;
}

export interface ProductPayload {
  name: string;
  sku?: string;
  description?: string;
  itemType?: ItemType;
  unit?: string;
  remarks?: string;
  unitPrice: number;
  currency?: string;
  currentStock?: number;
  lowStockThreshold?: number;
  reorderTimeDays?: number;
  quantityInReorder?: number;
  isComposite?: boolean;
  vendorId?: string | null;
  categoryId?: string | null;
  categoryIds?: string[];
  vendorIds?: string[];
  customFields?: Record<string, unknown>;
  bomItems?: { childProductId: string; quantityRequired: number }[];
}

/** Boolean query params must go over the wire as the literal strings the Zod enum accepts. */
function normalizeParams(params: ProductListParams) {
  const out: Record<string, unknown> = { ...params };
  for (const key of ["lowStock", "isDiscontinued", "isComposite"] as const) {
    if (params[key] === undefined) delete out[key];
    else out[key] = params[key] ? "true" : "false";
  }
  return out;
}

export const productsService = {
  /** GET /products */
  list: async (params: ProductListParams) => {
    const { data } = await apiClient.get<ApiEnvelope<ProductListResponse>>("/products", { params: normalizeParams(params) });
    return data.data as ProductListResponse;
  },

  /** GET /products/:id */
  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiEnvelope<Product>>(`/products/${id}`);
    return data.data as Product;
  },

  /** GET /products/low-stock — admin only. */
  lowStock: async () => {
    const { data } = await apiClient.get<ApiEnvelope<Product[]>>("/products/low-stock");
    return data.data ?? [];
  },

  /** POST /products — admin only; accepts multipart when an image is attached. */
  create: async (payload: ProductPayload | FormData) => {
    const isFormData = payload instanceof FormData;
    const { data } = await apiClient.post<ApiEnvelope<Product>>("/products", payload, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return data.data as Product;
  },

  /** PATCH /products/:id — admin only. */
  update: async (
    id: string,
    payload: (Partial<ProductPayload> & { isDiscontinued?: boolean; removeImage?: string }) | FormData,
  ) => {
    const isFormData = payload instanceof FormData;
    const { data } = await apiClient.patch<ApiEnvelope<Product>>(`/products/${id}`, payload, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return data.data as Product;
  },

  /** DELETE /products/:id — soft delete (marks discontinued). */
  remove: async (id: string) => {
    await apiClient.delete(`/products/${id}`);
  },

  /** GET /products/:id/bom — full multi-level BOM tree. */
  getBOM: async (id: string) => {
    const { data } = await apiClient.get<ApiEnvelope<BOMTreeNode>>(`/products/${id}/bom`);
    return data.data as BOMTreeNode;
  },

  /** GET /products/:id/bom/cost — priced breakdown + suggested cost warning. */
  getBOMCost: async (id: string) => {
    const { data } = await apiClient.get<ApiEnvelope<ProductCostResult>>(`/products/${id}/bom/cost`);
    return data.data as ProductCostResult;
  },

  /** PUT /products/:id/bom — admin only; replaces the whole component list. */
  replaceBOM: async (id: string, items: { childProductId: string; quantityRequired: number }[]) => {
    const { data } = await apiClient.put<ApiEnvelope<BOMTreeNode>>(`/products/${id}/bom`, { items });
    return data.data as BOMTreeNode;
  },

  /** POST /products/:id/custom-fields — admin only. */
  setCustomField: async (id: string, key: string, value: unknown) => {
    const { data } = await apiClient.post<ApiEnvelope<Product>>(`/products/${id}/custom-fields`, { key, value });
    return data.data as Product;
  },

  /** DELETE /products/:id/custom-fields/:key — admin only. */
  removeCustomField: async (id: string, key: string) => {
    const { data } = await apiClient.delete<ApiEnvelope<Product>>(`/products/${id}/custom-fields/${encodeURIComponent(key)}`);
    return data.data as Product;
  },
};
