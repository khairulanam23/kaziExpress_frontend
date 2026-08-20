"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productRequestsService, type ProductRequestListParams } from "@/services/product-requests.service";

const REQUESTS_KEY = ["product-requests"] as const;

export function useProductRequests(params?: ProductRequestListParams) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, params ?? {}],
    queryFn: () => productRequestsService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useProductRequest(id: string | null) {
  return useQuery({
    queryKey: ["product-request", id],
    queryFn: () => productRequestsService.getById(id as string),
    enabled: !!id,
  });
}

/** Live component expansion for a composite product at a given quantity. */
export function useBOMPreview(productId: string | null, quantity = 1, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["bom-preview", productId, quantity],
    queryFn: () => productRequestsService.bomPreview(productId as string, quantity),
    enabled: !!productId && quantity > 0 && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

function useInvalidateRequests() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useCreateProductRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (payload: Parameters<typeof productRequestsService.create>[0]) => productRequestsService.create(payload),
    onSuccess: invalidate,
  });
}

export function useDecideProductRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: "APPROVED" | "REJECTED"; rejectionReason?: string } }) =>
      productRequestsService.decide(id, payload),
    onSuccess: invalidate,
  });
}

export function useIssueProductRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: (id: string) => productRequestsService.issue(id),
    onSuccess: invalidate,
  });
}
