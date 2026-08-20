"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  contentTypesService,
  performanceService,
  type CreateContentTypePayload,
  type UpdateContentTypePayload,
} from "@/services/content-types.service";

// ── Content Types ─────────────────────────────────────────────────────────

export function useContentTypes(includeInactive = false) {
  return useQuery({
    queryKey: ["content-types", { includeInactive }],
    queryFn: () => contentTypesService.list(includeInactive),
  });
}

export function useContentType(id: string | null) {
  return useQuery({
    queryKey: ["content-type", id],
    queryFn: () => contentTypesService.getById(id as string),
    enabled: !!id,
  });
}

function useInvalidateContentTypes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["content-types"] });
}

export function useCreateContentType() {
  const invalidate = useInvalidateContentTypes();
  return useMutation({
    mutationFn: (payload: CreateContentTypePayload) => contentTypesService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateContentType() {
  const invalidate = useInvalidateContentTypes();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateContentTypePayload }) =>
      contentTypesService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteContentType() {
  const invalidate = useInvalidateContentTypes();
  return useMutation({
    mutationFn: (id: string) => contentTypesService.delete(id),
    onSuccess: invalidate,
  });
}

// ── Employee Records ──────────────────────────────────────────────────────

export function useMyRecords() {
  return useQuery({
    queryKey: ["employee-records", "me"],
    queryFn: () => contentTypesService.getMyRecords(),
  });
}

export function useUserRecords(userId: string | null) {
  return useQuery({
    queryKey: ["employee-records", "user", userId],
    queryFn: () => contentTypesService.getUserRecords(userId as string),
    enabled: !!userId,
  });
}

export function useUpsertRecord(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contentTypeId,
      data,
    }: {
      contentTypeId: string;
      data: Record<string, unknown>;
    }) => contentTypesService.upsertRecord(contentTypeId, { data }, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-records"] });
    },
  });
}

// ── Performance & Report ──────────────────────────────────────────────────

export function useEmployeePerformance(
  userId: string | null,
  year: number,
  month: number
) {
  return useQuery({
    queryKey: ["employee-performance", userId, year, month],
    queryFn: () => performanceService.getPerformance(userId as string, year, month),
    enabled: !!userId,
  });
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: ({ userId, year, month }: { userId: string; year: number; month: number }) =>
      performanceService.downloadReport(userId, year, month),
  });
}
