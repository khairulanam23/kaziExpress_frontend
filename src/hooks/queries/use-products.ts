"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsService, type ProductListParams, type ProductPayload } from "@/services/products.service";

const PRODUCTS_KEY = ["products"] as const;

export function useProducts(params: ProductListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, params],
    queryFn: () => productsService.list(params),
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => productsService.getById(id as string),
    enabled: !!id,
  });
}

export function useLowStockProducts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, "low-stock"],
    queryFn: () => productsService.lowStock(),
    ...options,
  });
}

export function useProductBOM(id: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["product", id, "bom"],
    queryFn: () => productsService.getBOM(id as string),
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useProductBOMCost(id: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["product", id, "bom-cost"],
    queryFn: () => productsService.getBOMCost(id as string),
    enabled: !!id && (options?.enabled ?? true),
  });
}

function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["reports"] });
    if (id) queryClient.invalidateQueries({ queryKey: ["product", id] });
  };
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (payload: ProductPayload | FormData) => productsService.create(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: (Partial<ProductPayload> & { isDiscontinued?: boolean; removeImage?: string }) | FormData;
    }) => productsService.update(id, payload),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: (_data, id) => invalidate(id),
  });
}

export function useReplaceBOM() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: { childProductId: string; quantityRequired: number }[] }) =>
      productsService.replaceBOM(id, items),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useSetProductCustomField() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, key, value }: { id: string; key: string; value: unknown }) =>
      productsService.setCustomField(id, key, value),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useRemoveProductCustomField() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, key }: { id: string; key: string }) => productsService.removeCustomField(id, key),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}
