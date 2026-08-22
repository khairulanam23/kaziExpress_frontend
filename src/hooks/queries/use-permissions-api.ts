"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { permissionsService } from "@/services/permissions.service";
import { useAuthStore } from "@/store/auth-store";

const PERMISSIONS_KEY = ["permissions"] as const;

export function usePermissionCatalog(options?: { enabled?: boolean }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...PERMISSIONS_KEY, "catalog"],
    queryFn: () => permissionsService.catalog(),
    enabled: isAuthenticated && (options?.enabled ?? true),
    // The catalogue is static configuration; refetching it per view is waste.
    staleTime: 10 * 60 * 1000,
  });
}

export function useEmployeePermissions(userId: string | null) {
  return useQuery({
    queryKey: [...PERMISSIONS_KEY, "employee", userId],
    queryFn: () => permissionsService.forEmployee(userId as string),
    enabled: !!userId,
  });
}

function useInvalidatePermissions() {
  const queryClient = useQueryClient();
  return (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: PERMISSIONS_KEY });
    queryClient.invalidateQueries({ queryKey: ["users"] });
    // A user's own permissions can change; refresh the session's copy.
    queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    if (userId) queryClient.invalidateQueries({ queryKey: [...PERMISSIONS_KEY, "employee", userId] });
  };
}

export function useReplacePermissions() {
  const invalidate = useInvalidatePermissions();
  return useMutation({
    mutationFn: ({ userId, permissions }: { userId: string; permissions: string[] }) =>
      permissionsService.replace(userId, permissions),
    onSuccess: (_d, vars) => invalidate(vars.userId),
  });
}

export function useAddPermissions() {
  const invalidate = useInvalidatePermissions();
  return useMutation({
    mutationFn: ({ userId, permissions }: { userId: string; permissions: string[] }) =>
      permissionsService.add(userId, permissions),
    onSuccess: (_d, vars) => invalidate(vars.userId),
  });
}

export function useRemovePermission() {
  const invalidate = useInvalidatePermissions();
  return useMutation({
    mutationFn: ({ userId, permissionKey }: { userId: string; permissionKey: string }) =>
      permissionsService.remove(userId, permissionKey),
    onSuccess: (_d, vars) => invalidate(vars.userId),
  });
}
