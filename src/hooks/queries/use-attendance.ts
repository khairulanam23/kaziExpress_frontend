"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceService, type AttendanceListParams } from "@/services/attendance.service";
import { useAuthStore } from "@/store/auth-store";

const ATTENDANCE_KEY = ["attendance"] as const;

export function useAttendance(params?: AttendanceListParams) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, "list", params ?? {}],
    queryFn: () => attendanceService.list(params),
    placeholderData: (prev) => prev,
  });
}

/**
 * Today's punch state. Refetched on a short interval so the "hours so far"
 * readout keeps pace while an employee is still clocked in.
 */
export function useTodayStatus() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, "today"],
    queryFn: () => attendanceService.today(),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
}

function useInvalidateAttendance() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["payroll"] });
    queryClient.invalidateQueries({ queryKey: ["reports"] });
  };
}

export function useCheckIn() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: () => attendanceService.checkIn(),
    onSuccess: invalidate,
  });
}

export function useCheckOut() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: () => attendanceService.checkOut(),
    onSuccess: invalidate,
  });
}

export function useDecideOvertime() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof attendanceService.decideOvertime>[1] }) =>
      attendanceService.decideOvertime(id, payload),
    onSuccess: invalidate,
  });
}

export function useOverrideAttendance() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof attendanceService.override>[1] }) =>
      attendanceService.override(id, payload),
    onSuccess: invalidate,
  });
}

export function useMonthlyOvertime(year: number, month: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, "overtime", year, month],
    queryFn: () => attendanceService.monthlyOvertime(year, month),
    ...options,
  });
}

export function useRequiredHours() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, "required-hours"],
    queryFn: () => attendanceService.getRequiredHours(),
    enabled: isAuthenticated,
  });
}

export function useSetRequiredHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hours: number) => attendanceService.setRequiredHours(hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY });
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
}
