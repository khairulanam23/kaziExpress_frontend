import { apiClient, API_BASE_URL, downloadFile, type ApiEnvelope } from "@/lib/api-client";
import type { DocumentCategory, LegalDocument, OrganizationProfile, Profile } from "@/types";

export interface UpdateProfilePayload {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  nidNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
}

export interface DocumentMetadataPayload {
  name: string;
  documentType: string;
  category?: DocumentCategory;
  expiryDate?: string | null;
  notes?: string | null;
}

/** Progress callback for uploads, so the UI can show a real percentage. */
export type UploadProgress = (percent: number) => void;

const withProgress = (onProgress?: UploadProgress) => ({
  headers: { "Content-Type": "multipart/form-data" },
  onUploadProgress: onProgress
    ? (event: { loaded: number; total?: number }) => {
        if (!event.total) return;
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    : undefined,
});

function documentFormData(payload: Partial<DocumentMetadataPayload>, file?: File) {
  const form = new FormData();
  if (payload.name !== undefined) form.append("name", payload.name);
  if (payload.documentType !== undefined) form.append("documentType", payload.documentType);
  if (payload.category !== undefined) form.append("category", payload.category);
  if (payload.expiryDate) form.append("expiryDate", payload.expiryDate);
  if (payload.notes) form.append("notes", payload.notes);
  if (file) form.append("file", file);
  return form;
}

export const profileService = {
  /** GET /profile/me */
  me: async () => {
    const { data } = await apiClient.get<ApiEnvelope<Profile>>("/profile/me");
    return data.data as Profile;
  },

  /** PUT /profile/me — self-editable fields only. */
  updateMe: async (payload: UpdateProfilePayload) => {
    const { data } = await apiClient.put<ApiEnvelope<Profile>>("/profile/me", payload);
    return data.data as Profile;
  },

  /** GET /profile/employees/:id — self or admin. */
  employee: async (userId: string) => {
    const { data } = await apiClient.get<ApiEnvelope<Profile>>(`/profile/employees/${userId}`);
    return data.data as Profile;
  },

  /** PATCH /profile/employees/:id — admin only: department & designation. */
  updateEmployment: async (userId: string, payload: { department?: string | null; designation?: string | null }) => {
    const { data } = await apiClient.patch<ApiEnvelope<Profile>>(`/profile/employees/${userId}`, payload);
    return data.data as Profile;
  },

  // ── Profile photo ────────────────────────────────────────────────────────

  uploadAvatar: async (file: File, onProgress?: UploadProgress) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<ApiEnvelope<Profile>>("/profile/me/avatar", form, withProgress(onProgress));
    return data.data as Profile;
  },

  removeAvatar: async () => {
    const { data } = await apiClient.delete<ApiEnvelope<Profile>>("/profile/me/avatar");
    return data.data as Profile;
  },

  // ── Legal documents ──────────────────────────────────────────────────────

  listMyDocuments: async (params?: { documentType?: string; category?: DocumentCategory }) => {
    const { data } = await apiClient.get<ApiEnvelope<LegalDocument[]>>("/profile/me/documents", { params });
    return data.data ?? [];
  },

  listEmployeeDocuments: async (userId: string, params?: { category?: DocumentCategory }) => {
    const { data } = await apiClient.get<ApiEnvelope<LegalDocument[]>>(`/profile/employees/${userId}/documents`, { params });
    return data.data ?? [];
  },

  uploadDocument: async (payload: DocumentMetadataPayload, file: File, onProgress?: UploadProgress) => {
    const { data } = await apiClient.post<ApiEnvelope<LegalDocument>>(
      "/profile/me/documents",
      documentFormData(payload, file),
      withProgress(onProgress),
    );
    return data.data as LegalDocument;
  },

  /** Updates metadata and, when `file` is given, replaces the stored bytes. */
  updateDocument: async (
    id: string,
    payload: Partial<DocumentMetadataPayload> & { isVerified?: boolean },
    file?: File,
    onProgress?: UploadProgress,
  ) => {
    if (file) {
      const { data } = await apiClient.put<ApiEnvelope<LegalDocument>>(
        `/profile/me/documents/${id}`,
        documentFormData(payload, file),
        withProgress(onProgress),
      );
      return data.data as LegalDocument;
    }
    const { data } = await apiClient.put<ApiEnvelope<LegalDocument>>(`/profile/me/documents/${id}`, payload);
    return data.data as LegalDocument;
  },

  deleteDocument: async (id: string) => {
    await apiClient.delete(`/profile/me/documents/${id}`);
  },

  /**
   * Fetches a document's bytes as an object URL for inline preview.
   *
   * The bytes are private, so this goes through the authenticated endpoint —
   * an <img src> or <iframe src> pointed at the API would carry no bearer
   * token and be rejected. Callers must revoke the URL when done.
   */
  previewUrl: async (id: string): Promise<{ url: string; revoke: () => void }> => {
    const response = await apiClient.get<Blob>(`/profile/me/documents/${id}/file`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  },

  downloadDocument: (id: string, filename: string) =>
    downloadFile(`/profile/me/documents/${id}/file`, filename, { download: 1 }),

  // ── Organisation ─────────────────────────────────────────────────────────

  organization: async () => {
    const { data } = await apiClient.get<ApiEnvelope<OrganizationProfile>>("/profile/organization");
    return data.data as OrganizationProfile;
  },

  updateOrganization: async (payload: Partial<Omit<OrganizationProfile, "id" | "createdAt" | "updatedAt" | "logoUrl">>) => {
    const { data } = await apiClient.put<ApiEnvelope<OrganizationProfile>>("/profile/organization", payload);
    return data.data as OrganizationProfile;
  },

  uploadOrganizationLogo: async (file: File, onProgress?: UploadProgress) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<ApiEnvelope<OrganizationProfile>>(
      "/profile/organization/logo",
      form,
      withProgress(onProgress),
    );
    return data.data as OrganizationProfile;
  },
};

/** Accepted upload formats, mirroring the backend's validation. */
export const ACCEPTED_DOCUMENT_MIME = ["application/pdf", "image/jpeg", "image/png"] as const;
export const ACCEPTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export { API_BASE_URL };
