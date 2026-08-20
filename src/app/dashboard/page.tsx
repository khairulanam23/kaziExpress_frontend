"use client";

import { AdminDashboard } from "@/features/dashboard/admin-dashboard";
import { EmployeeDashboard } from "@/features/dashboard/employee-dashboard";
import { useAuthStore } from "@/store/auth-store";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return user?.role === "EMPLOYEE" ? (
    <EmployeeDashboard userName={user.name} />
  ) : (
    <AdminDashboard userName={user?.name} />
  );
}
