"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksService, type CreateTaskPayload, type TaskListParams } from "@/services/tasks.service";
import type { TaskStatus } from "@/types";

const TASKS_KEY = ["tasks"] as const;

export function useTasks(params: TaskListParams) {
  return useQuery({
    queryKey: [...TASKS_KEY, params],
    queryFn: () => tasksService.list(params),
    placeholderData: (prev) => prev,
  });
}

/**
 * Row counts per status for the filter tiles. The list endpoint exposes no
 * aggregate, so each status asks for a single row and reads `totalData`.
 */
export function useTaskStatusCounts(statuses: readonly TaskStatus[]) {
  const results = useQueries({
    queries: statuses.map((status) => ({
      queryKey: [...TASKS_KEY, { status, showPerPage: 1 }],
      queryFn: () => tasksService.list({ status, showPerPage: 1 }),
    })),
    combine: (queries) => ({
      counts: Object.fromEntries(statuses.map((s, i) => [s, queries[i]?.data?.totalData ?? 0])) as Record<
        TaskStatus,
        number
      >,
      isLoading: queries.some((q) => q.isLoading),
    }),
  });

  return results;
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => tasksService.getById(id as string),
    enabled: !!id,
  });
}

/**
 * Every task transition moves inventory, so batches, movements, products and
 * the dashboard are all invalidated alongside the task itself.
 */
function useInvalidateTaskWorld() {
  const queryClient = useQueryClient();
  return (taskId?: string) => {
    queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["product-requests"] });
    if (taskId) queryClient.invalidateQueries({ queryKey: ["task", taskId] });
  };
}

export function useCreateTask() {
  const invalidate = useInvalidateTaskWorld();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksService.create(payload),
    onSuccess: () => invalidate(),
  });
}

export function useAcceptTask() {
  const invalidate = useInvalidateTaskWorld();
  return useMutation({
    mutationFn: (id: string) => tasksService.accept(id),
    onSuccess: (_data, id) => invalidate(id),
  });
}

export function useStartTask() {
  const invalidate = useInvalidateTaskWorld();
  return useMutation({
    mutationFn: (id: string) => tasksService.start(id),
    onSuccess: (_data, id) => invalidate(id),
  });
}

export function useReportProduction() {
  const invalidate = useInvalidateTaskWorld();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { completedQuantity: number; notes?: string } }) =>
      tasksService.reportProduction(id, payload),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useReportDamage() {
  const invalidate = useInvalidateTaskWorld();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { productId: string; batchId?: string; quantity: number; reason: string };
    }) => tasksService.reportDamage(id, payload),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useRequestTaskRefill() {
  const invalidate = useInvalidateTaskWorld();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { productId: string; quantity: number; reason?: string } }) =>
      tasksService.requestRefill(id, payload),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useDecideTaskRefill() {
  const invalidate = useInvalidateTaskWorld();
  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: string;
      payload: { status: "APPROVED" | "REJECTED"; rejectionReason?: string; allocatedBatchId?: string };
    }) => tasksService.decideRefill(requestId, payload),
    onSuccess: () => invalidate(),
  });
}

export function useCancelTask() {
  const invalidate = useInvalidateTaskWorld();
  return useMutation({
    mutationFn: (id: string) => tasksService.cancel(id),
    onSuccess: (_data, id) => invalidate(id),
  });
}
