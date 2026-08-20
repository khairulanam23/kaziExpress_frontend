"use client";

import * as React from "react";
import { SectionHeader } from "@/components/shared/chart-card";
import { currentPeriod, type Period } from "@/components/shared/period-picker";
import { AdminPayroll } from "@/features/payroll/admin-payroll";
import { EmployeePayroll } from "@/features/payroll/employee-payroll";
import { useAuthStore } from "@/store/auth-store";

export default function PayrollPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const [period, setPeriod] = React.useState<Period>(currentPeriod);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={isAdmin ? "Payroll" : "My payroll"}
        description={
          isAdmin
            ? "Review earnings, record salary payments and manage hourly rates."
            : "Your earnings, approved overtime, payments and remaining balance."
        }
      />
      {isAdmin ? (
        <AdminPayroll period={period} onPeriodChange={setPeriod} />
      ) : (
        <EmployeePayroll period={period} onPeriodChange={setPeriod} />
      )}
    </div>
  );
}
