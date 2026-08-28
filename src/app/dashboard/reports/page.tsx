"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  Award,
  Boxes,
  CalendarCheck,
  Coins,
  Factory,
  Gauge,
  PieChart,
  Scale,
  ShoppingCart,
  Trash2,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceReportView } from "@/features/reports/attendance-report";
import { EmployeePerformanceReportView } from "@/features/reports/employee-performance-report";
import { InventoryReportView } from "@/features/reports/inventory-report";
import { PayrollReportView } from "@/features/reports/payroll-report";
import { ProductionReportView } from "@/features/reports/production-report";
import { StockMovementReportView } from "@/features/reports/stock-movement-report";
import { WasteReportView } from "@/features/reports/waste-report";
import { ReorderReportView } from "@/features/reports/reorder-report";
import { ProductionCostReportView } from "@/features/reports/production-cost-report";
import { ValuationReportView } from "@/features/reports/valuation-report";
import { LabourEfficiencyReportView } from "@/features/reports/labour-efficiency-report";
import { VendorPerformanceReportView } from "@/features/reports/vendor-performance-report";
import { ProfitReportView } from "@/features/reports/profit-report";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/use-permissions";

interface ReportTab {
  value: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
  permission: string;
  render: () => React.ReactNode;
}

/**
 * Reports centre.
 *
 * Each report is gated on the permission its endpoint enforces, so a user only
 * ever sees tabs that will actually return data — previously the tabs were
 * role-gated, which offered permission-holding employees reports the server
 * then rejected with 403.
 */
export default function ReportsPage() {
  const { has } = usePermissions();

  const allTabs = React.useMemo<ReportTab[]>(
    () => [
      {
        value: "profit",
        label: "Profit",
        icon: Coins,
        blurb: "Revenue against what the goods cost to make",
        permission: PERMISSIONS.REPORT_PROFIT,
        render: () => <ProfitReportView />,
      },
      {
        value: "inventory",
        label: "Inventory",
        icon: Boxes,
        blurb: "Valuation, stock health and category breakdown",
        permission: PERMISSIONS.REPORT_INVENTORY,
        render: () => <InventoryReportView />,
      },
      {
        value: "reorder",
        label: "Reorder",
        icon: ShoppingCart,
        blurb: "What to order now, based on how fast it is actually being used",
        permission: PERMISSIONS.REPORT_INVENTORY,
        render: () => <ReorderReportView />,
      },
      {
        value: "valuation",
        label: "Valuation",
        icon: Scale,
        blurb: "Stock on hand at what it actually cost to acquire",
        permission: PERMISSIONS.REPORT_INVENTORY,
        render: () => <ValuationReportView />,
      },
      {
        value: "waste",
        label: "Waste",
        icon: Trash2,
        blurb: "What was damaged or written off, and what it cost",
        permission: PERMISSIONS.REPORT_STOCK_MOVEMENTS,
        render: () => <WasteReportView />,
      },
      {
        value: "movements",
        label: "Stock movements",
        icon: ArrowLeftRight,
        blurb: "Full audit trail of every stock change",
        permission: PERMISSIONS.REPORT_STOCK_MOVEMENTS,
        render: () => <StockMovementReportView />,
      },
      {
        value: "production",
        label: "Production",
        icon: Factory,
        blurb: "Output, completion rates and per-employee yield",
        permission: PERMISSIONS.REPORT_PRODUCTION,
        render: () => <ProductionReportView />,
      },
      {
        value: "production-cost",
        label: "Production cost",
        icon: Coins,
        blurb: "What each run cost to make, per unit",
        permission: PERMISSIONS.REPORT_PRODUCTION,
        render: () => <ProductionCostReportView />,
      },
      {
        value: "labour",
        label: "Labour",
        icon: Gauge,
        blurb: "Output per hour and how often deadlines are met",
        permission: PERMISSIONS.REPORT_PRODUCTION,
        render: () => <LabourEfficiencyReportView />,
      },
      {
        value: "vendors",
        label: "Vendors",
        icon: Truck,
        blurb: "Purchase price history and cost drift per supplier",
        permission: PERMISSIONS.REPORT_INVENTORY,
        render: () => <VendorPerformanceReportView />,
      },
      {
        value: "attendance",
        label: "Attendance",
        icon: CalendarCheck,
        blurb: "Hours worked, coverage and overtime",
        permission: PERMISSIONS.REPORT_ATTENDANCE,
        render: () => <AttendanceReportView />,
      },
      {
        value: "payroll",
        label: "Payroll",
        icon: Wallet,
        blurb: "Earnings, payments and outstanding balances",
        permission: PERMISSIONS.REPORT_PAYROLL,
        render: () => <PayrollReportView />,
      },
      {
        value: "performance",
        label: "Performance",
        icon: Award,
        blurb: "One person's attendance, output and pay",
        permission: PERMISSIONS.REPORT_EMPLOYEE_PERFORMANCE,
        render: () => <EmployeePerformanceReportView />,
      },
    ],
    [],
  );

  const tabs = React.useMemo(() => allTabs.filter((t) => has(t.permission)), [allTabs, has]);
  const [tab, setTab] = React.useState<string | null>(null);
  const activeTab = tab ?? tabs[0]?.value ?? null;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Reports"
        description="Operational and financial reporting, exportable as PDF or CSV."
      />

      {tabs.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="No reports available to you"
          description="Reporting access is granted per report. Ask an administrator if you need it."
        />
      ) : (
        <Tabs value={activeTab ?? undefined} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                <t.icon className="size-3.5" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              {/* Render lazily so a hidden tab never fires its queries. */}
              {activeTab === t.value ? t.render() : null}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
