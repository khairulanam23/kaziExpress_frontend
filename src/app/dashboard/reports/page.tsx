"use client";

import * as React from "react";
import { SectionHeader } from "@/components/shared/chart-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceReportView } from "@/features/reports/attendance-report";
import { EmployeePerformanceReportView } from "@/features/reports/employee-performance-report";
import { InventoryReportView } from "@/features/reports/inventory-report";
import { PayrollReportView } from "@/features/reports/payroll-report";
import { ProductionReportView } from "@/features/reports/production-report";
import { StockMovementReportView } from "@/features/reports/stock-movement-report";
import { useAuthStore } from "@/store/auth-store";

/**
 * Reports hub. Employees only see the reports the API will serve them —
 * production, attendance and their own performance are scoped server-side,
 * while inventory, stock-movement and payroll reports are admin-only.
 */
export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const tabs = React.useMemo(
    () =>
      [
        ...(isAdmin ? [{ value: "inventory", label: "Inventory" }] : []),
        ...(isAdmin ? [{ value: "movements", label: "Stock movements" }] : []),
        { value: "production", label: "Production" },
        { value: "attendance", label: "Attendance" },
        ...(isAdmin ? [{ value: "payroll", label: "Payroll" }] : []),
        { value: "performance", label: isAdmin ? "Employee performance" : "My performance" },
      ] as const,
    [isAdmin],
  );

  const [tab, setTab] = React.useState<string>(isAdmin ? "inventory" : "production");

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Reports"
        description={
          isAdmin
            ? "Inventory valuation, audit trails, production output, attendance and payroll — exportable as PDF or CSV."
            : "Your production output, attendance and performance — exportable as PDF or CSV."
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {isAdmin && (
          <TabsContent value="inventory" className="mt-4">
            <InventoryReportView />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="movements" className="mt-4">
            <StockMovementReportView />
          </TabsContent>
        )}
        <TabsContent value="production" className="mt-4">
          <ProductionReportView />
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          <AttendanceReportView />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="payroll" className="mt-4">
            <PayrollReportView />
          </TabsContent>
        )}
        <TabsContent value="performance" className="mt-4">
          <EmployeePerformanceReportView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
