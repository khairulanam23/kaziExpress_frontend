"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { configService } from "@/services/config.service";
import { useAuthStore } from "@/store/auth-store";

export function useSystemConfig() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["config"],
    queryFn: () => configService.getAll(),
    enabled: isAuthenticated,
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Record<string, unknown>) => configService.update(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}
