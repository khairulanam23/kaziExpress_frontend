"use client";

import { SectionHeader } from "@/components/shared/chart-card";
import { AttendanceView } from "@/features/attendance/attendance-view";
import { useAuthStore } from "@/store/auth-store";

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Attendance"
        description={
          isAdmin
            ? "Track check-ins, review overtime and correct punch records."
            : "Clock in and out, and review your own attendance history."
        }
      />
      <AttendanceView />
    </div>
  );
}
