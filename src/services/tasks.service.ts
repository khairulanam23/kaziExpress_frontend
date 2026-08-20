import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { InventoryBatch, ProductRequest, StockMovement, Task, TaskStatus } from "@/types";

export interface TaskListParams {
  status?: TaskStatus;
  assigneeId?: string;
  createdBy?: string;
  productId?: string;
  pageNo?: number;
  showPerPage?: number;
}

export interface TaskListResponse {
  tasks: Task[];
  totalData: number;
  totalPages: number;
  currentPage: number;
}

/** POST /tasks — admin only. `batchAllocations` reserve specific material batches. */
export interface CreateTaskPayload {
  title: string;
  description?: string;
  productId: string;
  productionQuantity: number;
  assignedEmployeeIds?: string[];
  /** YYYY-MM-DD */
  deadline?: string;
  parentTaskId?: string | null;
  batchAllocations?: { batchId: string; quantity: number }[];
}

export interface ReportProductionResult {
  task: Task;
  outputBatch: InventoryBatch;
}

export const tasksService = {
  /** GET /tasks — admin sees all, employee sees assigned/created. */
  list: async (params: TaskListParams) => {
    const { data } = await apiClient.get<ApiEnvelope<TaskListResponse>>("/tasks", { params });
    return data.data as TaskListResponse;
  },

  /** GET /tasks/:id */
  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiEnvelope<Task>>(`/tasks/${id}`);
    return data.data as Task;
  },

  /** POST /tasks */
  create: async (payload: CreateTaskPayload) => {
    const { data } = await apiClient.post<ApiEnvelope<Task>>("/tasks", payload);
    return data.data as Task;
  },

  /** POST /tasks/:id/accept — reserves the task's allocated batches. */
  accept: async (id: string) => {
    const { data } = await apiClient.post<ApiEnvelope<Task>>(`/tasks/${id}/accept`);
    return data.data as Task;
  },

  /** POST /tasks/:id/start */
  start: async (id: string) => {
    const { data } = await apiClient.post<ApiEnvelope<Task>>(`/tasks/${id}/start`);
    return data.data as Task;
  },

  /** POST /tasks/:id/report-production — full or partial; consumes materials, emits an output batch. */
  reportProduction: async (id: string, payload: { completedQuantity: number; notes?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<ReportProductionResult>>(`/tasks/${id}/report-production`, payload);
    return data.data as ReportProductionResult;
  },

  /** POST /tasks/:id/report-damage */
  reportDamage: async (id: string, payload: { productId: string; batchId?: string; quantity: number; reason: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<StockMovement>>(`/tasks/${id}/report-damage`, payload);
    return data.data as StockMovement;
  },

  /** POST /tasks/:id/refill-request */
  requestRefill: async (id: string, payload: { productId: string; quantity: number; reason?: string }) => {
    const { data } = await apiClient.post<ApiEnvelope<ProductRequest>>(`/tasks/${id}/refill-request`, payload);
    return data.data as ProductRequest;
  },

  /** PATCH /tasks/refill-requests/:id — admin approves/rejects, optionally allocating a batch. */
  decideRefill: async (
    requestId: string,
    payload: { status: "APPROVED" | "REJECTED"; rejectionReason?: string; allocatedBatchId?: string },
  ) => {
    const { data } = await apiClient.patch<ApiEnvelope<ProductRequest>>(`/tasks/refill-requests/${requestId}`, payload);
    return data.data as ProductRequest;
  },

  /** POST /tasks/:id/cancel — admin only; releases any reserved inventory. */
  cancel: async (id: string) => {
    const { data } = await apiClient.post<ApiEnvelope<Task>>(`/tasks/${id}/cancel`);
    return data.data as Task;
  },
};
