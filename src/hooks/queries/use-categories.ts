"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesService, type CategoryListParams } from "@/services/categories.service";

const CATEGORIES_KEY = ["categories"] as const;

export function useCategories(params?: CategoryListParams) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, params ?? {}],
    queryFn: () => categoriesService.list(params ?? { showPerPage: 100 }),
    placeholderData: (prev) => prev,
  });
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) => categoriesService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string; description?: string } }) =>
      categoriesService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => categoriesService.remove(id),
    onSuccess: invalidate,
  });
}
