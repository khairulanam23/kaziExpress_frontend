import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { Category } from "@/types";

export interface CategoryListParams {
  searchKey?: string;
  pageNo?: number;
  showPerPage?: number;
}

export const categoriesService = {
  /** GET /categories */
  list: async (params?: CategoryListParams) => {
    const { data } = await apiClient.get<ApiEnvelope<{ categories: Category[]; totalData: number; totalPages: number }>>(
      "/categories",
      { params },
    );
    return data.data as { categories: Category[]; totalData: number; totalPages: number };
  },

  /** GET /categories/:id */
  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiEnvelope<Category>>(`/categories/${id}`);
    return data.data as Category;
  },

  /** POST /categories — admin only. */
  create: async (payload: { name: string; description?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<Category>>("/categories", payload);
    return data.data as Category;
  },

  /** PATCH /categories/:id — admin only. */
  update: async (id: string, payload: { name?: string; description?: string }) => {
    const { data } = await apiClient.patch<ApiEnvelope<Category>>(`/categories/${id}`, payload);
    return data.data as Category;
  },

  /** DELETE /categories/:id — admin only. */
  remove: async (id: string) => {
    await apiClient.delete(`/categories/${id}`);
  },
};

export type { Category } from "@/types";
