import { apiClient, type ApiEnvelope } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────────────

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "dropdown"
  | "radio"
  | "checkbox"
  | "file"
  | "textarea";

export interface FieldOption {
  label: string;
  value: string;
}

export interface ContentField {
  id: string;
  contentTypeId: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  order: number;
  options?: FieldOption[] | null;
  placeholder?: string | null;
  helpText?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentType {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  fields: ContentField[];
  _count?: { records: number };
}

export interface EmployeeRecord {
  id: string;
  userId: string;
  contentTypeId: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  contentType: ContentType;
}

export interface EmployeeRecordGroup {
  contentType: ContentType;
  record: EmployeeRecord | null;
}

export interface CreateContentTypePayload {
  name: string;
  description?: string | null;
  fields: Omit<ContentField, "id" | "contentTypeId" | "createdAt" | "updatedAt">[];
}

export interface UpdateContentTypePayload {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  fields?: (Partial<ContentField> & { label: string; fieldType: FieldType })[];
}

// ── Service ────────────────────────────────────────────────────────────────

export const contentTypesService = {
  list: async (includeInactive = false): Promise<ContentType[]> => {
    const { data } = await apiClient.get<ApiEnvelope<ContentType[]>>(
      "/content-types",
      { params: includeInactive ? { includeInactive: "true" } : undefined }
    );
    return data.data as ContentType[];
  },

  getById: async (id: string): Promise<ContentType> => {
    const { data } = await apiClient.get<ApiEnvelope<ContentType>>(`/content-types/${id}`);
    return data.data as ContentType;
  },

  create: async (payload: CreateContentTypePayload): Promise<ContentType> => {
    const { data } = await apiClient.post<ApiEnvelope<ContentType>>("/content-types", payload);
    return data.data as ContentType;
  },

  update: async (id: string, payload: UpdateContentTypePayload): Promise<ContentType> => {
    const { data } = await apiClient.patch<ApiEnvelope<ContentType>>(`/content-types/${id}`, payload);
    return data.data as ContentType;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/content-types/${id}`);
  },

  // ── Employee Records ────────────────────────────────────────────────────
  getMyRecords: async (): Promise<EmployeeRecordGroup[]> => {
    const { data } = await apiClient.get<ApiEnvelope<EmployeeRecordGroup[]>>("/content-types/records/me");
    return data.data as EmployeeRecordGroup[];
  },

  getUserRecords: async (userId: string): Promise<EmployeeRecordGroup[]> => {
    const { data } = await apiClient.get<ApiEnvelope<EmployeeRecordGroup[]>>(`/content-types/records/user/${userId}`);
    return data.data as EmployeeRecordGroup[];
  },

  upsertRecord: async (
    contentTypeId: string,
    payload: { data: Record<string, unknown> },
    userId?: string // if undefined, upserts own record
  ): Promise<EmployeeRecord> => {
    const url = userId
      ? `/content-types/${contentTypeId}/records/user/${userId}`
      : `/content-types/${contentTypeId}/records/me`;
    const { data } = await apiClient.put<ApiEnvelope<EmployeeRecord>>(url, payload);
    return data.data as EmployeeRecord;
  },
};

// ── Performance & Report ────────────────────────────────────────────────────

export interface PerformanceSummary {
  userId: string;
  period: { year: number; month: number; from: string; to: string };
  tasks: {
    assigned: number;
    completed: number;
    inProgress: number;
    pending: number;
    cancelled: number;
    completionRate: number;
    completedTaskDates: string[];
  };
  attendance: {
    daysWorked: number;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
  };
  earnings: {
    regularPay: number;
    overtimePay: number;
    totalEstimatedPay: number;
    hourlyRate: number;
    dailyRate: number;
    estimatedDailyIncome: number;
    payCalculationMode: string;
    currency: string;
  };
}

export const performanceService = {
  getPerformance: async (userId: string, year: number, month: number): Promise<PerformanceSummary> => {
    const { data } = await apiClient.get<ApiEnvelope<PerformanceSummary>>(
      `/users/${userId}/performance`,
      { params: { year, month } }
    );
    return data.data as PerformanceSummary;
  },

  downloadReport: async (userId: string, year: number, month: number): Promise<void> => {
    const response = await apiClient.get(`/users/${userId}/report`, {
      params: { year, month },
      responseType: "blob",
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-report-${userId.slice(0, 8)}-${year}-${month}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
