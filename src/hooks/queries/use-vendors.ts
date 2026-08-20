"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vendorsService, type VendorListParams, type VendorPayload } from "@/services/vendors.service";

const VENDORS_KEY = ["vendors"] as const;

export function useVendors(params?: VendorListParams) {
  return useQuery({
    queryKey: [...VENDORS_KEY, params ?? {}],
    queryFn: () => vendorsService.list(params ?? { showPerPage: 100 }),
    placeholderData: (prev) => prev,
  });
}

function useInvalidateVendors() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: VENDORS_KEY });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };
}

export function useCreateVendor() {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (payload: VendorPayload) => vendorsService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateVendor() {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<VendorPayload> }) => vendorsService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteVendor() {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (id: string) => vendorsService.remove(id),
    onSuccess: invalidate,
  });
}
