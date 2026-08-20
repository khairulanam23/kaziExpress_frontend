"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  profileService,
  type DocumentMetadataPayload,
  type UpdateProfilePayload,
  type UploadProgress,
} from "@/services/profile.service";
import { useAuthStore } from "@/store/auth-store";
import type { DocumentCategory, OrganizationProfile } from "@/types";

const PROFILE_KEY = ["profile"] as const;

export function useMyProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...PROFILE_KEY, "me"],
    queryFn: () => profileService.me(),
    enabled: isAuthenticated,
  });
}

export function useEmployeeProfile(userId: string | null) {
  return useQuery({
    queryKey: [...PROFILE_KEY, "employee", userId],
    queryFn: () => profileService.employee(userId as string),
    enabled: !!userId,
  });
}

/** Profile edits change the avatar and name shown across the shell. */
function useInvalidateProfile() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };
}

export function useUpdateMyProfile() {
  const invalidate = useInvalidateProfile();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileService.updateMe(payload),
    onSuccess: (profile) => {
      // Keep the cached session in step so the header updates immediately.
      if (user) setUser({ ...user, name: profile.name, phone: profile.phone, address: profile.address });
      invalidate();
    },
  });
}

export function useUpdateEmployment() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: { department?: string | null; designation?: string | null } }) =>
      profileService.updateEmployment(userId, payload),
    onSuccess: invalidate,
  });
}

export function useUploadAvatar() {
  const invalidate = useInvalidateProfile();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: UploadProgress }) =>
      profileService.uploadAvatar(file, onProgress),
    onSuccess: (profile) => {
      if (user) setUser({ ...user, avatarUrl: profile.avatarUrl });
      invalidate();
    },
  });
}

export function useRemoveAvatar() {
  const invalidate = useInvalidateProfile();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: () => profileService.removeAvatar(),
    onSuccess: () => {
      if (user) setUser({ ...user, avatarUrl: null });
      invalidate();
    },
  });
}

// ── Documents ──────────────────────────────────────────────────────────────

const DOCUMENTS_KEY = ["profile", "documents"] as const;

export function useMyDocuments(params?: { category?: DocumentCategory }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, "me", params ?? {}],
    queryFn: () => profileService.listMyDocuments(params),
    enabled: isAuthenticated,
  });
}

export function useEmployeeDocuments(userId: string | null) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, "employee", userId],
    queryFn: () => profileService.listEmployeeDocuments(userId as string),
    enabled: !!userId,
  });
}

function useInvalidateDocuments() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
}

export function useUploadDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({
      payload,
      file,
      onProgress,
    }: {
      payload: DocumentMetadataPayload;
      file: File;
      onProgress?: UploadProgress;
    }) => profileService.uploadDocument(payload, file, onProgress),
    onSuccess: invalidate,
  });
}

export function useUpdateDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      file,
      onProgress,
    }: {
      id: string;
      payload: Partial<DocumentMetadataPayload> & { isVerified?: boolean };
      file?: File;
      onProgress?: UploadProgress;
    }) => profileService.updateDocument(id, payload, file, onProgress),
    onSuccess: invalidate,
  });
}

export function useDeleteDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (id: string) => profileService.deleteDocument(id),
    onSuccess: invalidate,
  });
}

// ── Organisation ───────────────────────────────────────────────────────────

const ORG_KEY = ["profile", "organization"] as const;

export function useOrganization() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ORG_KEY,
    queryFn: () => profileService.organization(),
    enabled: isAuthenticated,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Omit<OrganizationProfile, "id" | "createdAt" | "updatedAt" | "logoUrl">>) =>
      profileService.updateOrganization(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_KEY }),
  });
}

export function useUploadOrganizationLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: UploadProgress }) =>
      profileService.uploadOrganizationLogo(file, onProgress),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_KEY }),
  });
}
