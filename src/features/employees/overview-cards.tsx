"use client";

import { Users, UserCheck, Building2, Clock4 } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { useUsers } from "@/hooks/queries/use-users";
import { useAttendance } from "@/hooks/queries/use-attendance";
import { formatNumber } from "@/lib/utils";

export function EmployeeOverviewCards() {
  const { data: allEmployees } = useUsers({ role: "EMPLOYEE", showPerPage: 200 });
  const { data: activeEmployees } = useUsers({ role: "EMPLOYEE", isActive: true, showPerPage: 1 });

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayAttendance } = useAttendance({ from: today, to: today, showPerPage: 200 });

  const employees = allEmployees?.users ?? [];
  const departments = new Set(employees.map((e) => e.employeeProfile?.department).filter(Boolean));
  const checkedInToday = (todayAttendance?.records ?? []).filter((r) => !!r.checkIn).length;

  const cards = [
    { label: "Total employees", value: formatNumber(allEmployees?.totalData ?? 0), icon: Users, accent: "primary" as const },
    { label: "Active employees", value: formatNumber(activeEmployees?.totalData ?? 0), icon: UserCheck, accent: "success" as const },
    { label: "Departments", value: formatNumber(departments.size), icon: Building2, accent: "secondary" as const },
    { label: "Checked in today", value: formatNumber(checkedInToday), icon: Clock4, accent: "warning" as const },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </div>
  );
}
