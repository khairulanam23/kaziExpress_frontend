"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inventoryService,
  stockMovementsService,
  type MovementListParams,
  type StockMovementListParams,
} from "@/services/inventory.service";

export function useBatches(productId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["inventory", "batches", productId ?? "all"],
    queryFn: () => inventoryService.batches(productId),
    ...options,
  });
}

export function useInventoryMovements(params?: MovementListParams) {
  return useQuery({
    queryKey: ["inventory", "movements", params ?? {}],
    queryFn: () => inventoryService.movements(params),
    placeholderData: (prev) => prev,
  });
}

export function useStockMovements(params?: StockMovementListParams) {
  return useQuery({
    queryKey: ["stock-movements", params ?? {}],
    queryFn: () => stockMovementsService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useProductMovements(productId: string | null) {
  return useQuery({
    queryKey: ["stock-movements", "product", productId],
    queryFn: () => stockMovementsService.forProduct(productId as string),
    enabled: !!productId,
  });
}

/** Any stock change ripples through products, batches, movements and the dashboard. */
function useInvalidateStock() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["reports"] });
  };
}

export function useAddStock() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (payload: Parameters<typeof inventoryService.addStock>[0]) => inventoryService.addStock(payload),
    onSuccess: invalidate,
  });
}

export function useAdjustStock() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (payload: Parameters<typeof inventoryService.adjustStock>[0]) => inventoryService.adjustStock(payload),
    onSuccess: invalidate,
  });
}

export function useCreateStockMovement() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (payload: Parameters<typeof stockMovementsService.create>[0]) => stockMovementsService.create(payload),
    onSuccess: invalidate,
  });
}

export function useConsumeStock() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (payload: Parameters<typeof stockMovementsService.consume>[0]) => stockMovementsService.consume(payload),
    onSuccess: invalidate,
  });
}

export function useAssembleProduct() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (payload: Parameters<typeof stockMovementsService.assemble>[0]) => stockMovementsService.assemble(payload),
    onSuccess: invalidate,
  });
}
