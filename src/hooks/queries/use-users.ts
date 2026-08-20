"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  usersService,
  type CreateEmployeePayload,
  type UpdateEmployeePayload,
  type UserListParams,
} from "@/services/users.service";
import { useAuthStore } from "@/store/auth-store";

const USERS_KEY = ["users"] as const;

export function useUsers(params: UserListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...USERS_KEY, params],
    queryFn: () => usersService.list(params),
    placeholderData: (prev) => prev,
    ...options,
  });
}

/** Convenience list of active employees for assignment pickers. */
export function useEmployeeOptions(options?: { enabled?: boolean }) {
  const query = useUsers({ role: "EMPLOYEE", isActive: true, showPerPage: 200 }, options);
  return { ...query, employees: query.data?.users ?? [] };
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => usersService.getById(id as string),
    enabled: !!id,
  });
}

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersService.me(),
    enabled: isAuthenticated,
  });
}

export function useMyEarnings(params?: { from?: string; to?: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["users", "me", "earnings", params ?? {}],
    queryFn: () => usersService.myEarnings(params),
    enabled: isAuthenticated,
  });
}

export function useEmployeePerformance(id: string | null, params?: { year?: number; month?: number }) {
  return useQuery({
    queryKey: ["user", id, "performance", params ?? {}],
    queryFn: () => usersService.performance(id as string, params),
    enabled: !!id,
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: USERS_KEY });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    if (id) queryClient.invalidateQueries({ queryKey: ["user", id] });
  };
}

export function useCreateEmployee() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => usersService.create(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEmployeePayload }) => usersService.update(id, payload),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useDeactivateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => usersService.deactivate(id),
    onSuccess: (_data, id) => invalidate(id),
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (payload: { name?: string; address?: string; phone?: string }) => usersService.updateMe(payload),
    onSuccess: (user) => {
      setUser(user);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
}
