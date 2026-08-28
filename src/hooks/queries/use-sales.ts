"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  customerService,
  salesService,
  type CreateDispositionPayload,
  type CustomerPayload,
  type FinishedGoodsParams,
} from "@/services/sales.service";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import type { CustomerType, DispositionType } from "@/types";

const FINISHED_GOODS_KEY = ["finished-goods"] as const;
const CUSTOMERS_KEY = ["customers"] as const;

/**
 * Recording a sale moves stock, so it touches far more than the sales screens —
 * the batch, the product, inventory valuation, the dashboard and every profit
 * figure all change together.
 */
function useInvalidateSales() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: FINISHED_GOODS_KEY });
    queryClient.invalidateQueries({ queryKey: ["dispositions"] });
    queryClient.invalidateQueries({ queryKey: ["profit"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product"] });
    queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    queryClient.invalidateQueries({ queryKey: ["reports"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useFinishedGoods(params?: FinishedGoodsParams) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: [...FINISHED_GOODS_KEY, "list", params ?? {}],
    queryFn: () => salesService.finishedGoods(params),
    enabled: has(PERMISSIONS.FINISHED_GOODS_VIEW),
  });
}

export function useFinishedGoodsBatch(batchId: string | null) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: [...FINISHED_GOODS_KEY, "batch", batchId],
    queryFn: () => salesService.finishedGoodsBatch(batchId as string),
    enabled: !!batchId && has(PERMISSIONS.FINISHED_GOODS_VIEW),
  });
}

export function useDispositions(params?: {
  from?: string; to?: string; type?: DispositionType; customerId?: string;
  productId?: string; includeReversed?: boolean; showPerPage?: number; pageNo?: number;
}) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: ["dispositions", params ?? {}],
    queryFn: () => salesService.dispositions(params),
    enabled: has(PERMISSIONS.FINISHED_GOODS_VIEW),
  });
}

export function useProfitReport(params?: {
  from?: string; to?: string; productId?: string; customerId?: string; includeStoreTransfers?: boolean;
}) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: ["profit", params ?? {}],
    queryFn: () => salesService.profit(params),
    enabled: has(PERMISSIONS.REPORT_PROFIT),
  });
}

export function useCreateDisposition() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: ({ batchId, payload }: { batchId: string; payload: CreateDispositionPayload }) =>
      salesService.createDisposition(batchId, payload),
    onSuccess: invalidate,
  });
}

export function useReverseDisposition() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesService.reverseDisposition(id, reason),
    onSuccess: invalidate,
  });
}

export function useSetSellingPrice() {
  const invalidate = useInvalidateSales();
  return useMutation({
    mutationFn: ({ productId, sellingPrice }: { productId: string; sellingPrice: number | null }) =>
      salesService.setSellingPrice(productId, sellingPrice),
    onSuccess: invalidate,
  });
}

// ── Customers ──────────────────────────────────────────────────────────────

export function useCustomers(
  params?: { search?: string; type?: CustomerType; includeInactive?: boolean },
  options?: { enabled?: boolean },
) {
  const { has } = usePermissions();
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, params ?? {}],
    queryFn: () => customerService.list(params),
    enabled: (options?.enabled ?? true) && has(PERMISSIONS.CUSTOMER_VIEW),
  });
}

function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    queryClient.invalidateQueries({ queryKey: ["profit"] });
  };
}

export function useCreateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({ mutationFn: (payload: CustomerPayload) => customerService.create(payload), onSuccess: invalidate });
}

export function useUpdateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CustomerPayload }) => customerService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({ mutationFn: (id: string) => customerService.remove(id), onSuccess: invalidate });
}
