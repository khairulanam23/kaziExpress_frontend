"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  CheckCircle2,
  Clock,
  Factory,
  Users,
  Wallet,
} from "lucide-react";
import { ChartCard, SectionHeader } from "@/components/shared/chart-card";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/shared/states";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker, currentMonthRange, type DateRange } from "@/components/shared/period-picker";
import { useAdminDashboard } from "@/hooks/queries/use-dashboard";
import { useProductRequests } from "@/hooks/queries/use-product-requests";
import { ActivityTimeline } from "./activity-timeline";
import { AlertsPanel } from "./alerts-panel";
import { percent } from "@/lib/calc";
import { formatCurrency, formatNumber, formatPercent, formatQuantity, formatRelativeTime } from "@/lib/utils";

const ProductionMixChart = dynamic(() => import("./dashboard-charts").then((m) => m.ProductionMixChart), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-2xl" />,
});
const InventoryHealthChart = dynamic(() => import("./dashboard-charts").then((m) => m.InventoryHealthChart), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-2xl" />,
});
const PayrollProgressChart = dynamic(() => import("./dashboard-charts").then((m) => m.PayrollProgressChart), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-2xl" />,
});

export function AdminDashboard({ userName }: { userName?: string | null }) {
  const [range, setRange] = React.useState<DateRange>(currentMonthRange);
  const validRange = range.from <= range.to ? range : undefined;

  const { data, isLoading, isError, error, refetch } = useAdminDashboard(validRange);
  // Pending requests aren't part of the dashboard payload but are a decision
  // waiting on an admin, so they belong in the alerts strip.
  const { data: pendingRequests } = useProductRequests({ status: "PENDING", showPerPage: 1 });

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader title="Dashboard" description="Operational overview across inventory, production and people." />
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const inventory = data?.inventory;
  const production = data?.production;
  const employees = data?.employees;
  const payroll = data?.payroll;
  const notifications = data?.notifications;

  const attendanceRate = percent(employees?.checkedInToday ?? 0, employees?.totalActiveEmployees ?? 0);
  const payrollPaidRate = percent(payroll?.currentMonthPaidAmount ?? 0, payroll?.currentMonthTotalEarnings ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={`Welcome back${userName ? `, ${userName.split(" ")[0]}` : ""}`}
        description="Live view of inventory, production, attendance and payroll."
        action={<DateRangePicker value={range} onChange={setRange} />}
      />

      <AlertsPanel data={data} pendingRequests={pendingRequests?.totalData} />

      {isLoading && !data ? (
        <CardGridSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Inventory value"
            value={formatCurrency(inventory?.totalInventoryValue ?? 0, true)}
            icon={Boxes}
            accent="primary"
            helper={`${formatNumber(inventory?.totalActiveItems ?? 0)} active items · ${formatQuantity(inventory?.totalInventoryQuantity ?? 0)} units`}
          />
          <StatCard
            label="Needs restocking"
            value={formatNumber((inventory?.lowStockCount ?? 0) + (inventory?.outOfStockCount ?? 0))}
            icon={AlertTriangle}
            accent={inventory?.outOfStockCount ? "destructive" : "warning"}
            helper={`${formatNumber(inventory?.lowStockCount ?? 0)} low · ${formatNumber(inventory?.outOfStockCount ?? 0)} out of stock`}
          />
          <StatCard
            label="Active production tasks"
            value={formatNumber(production?.totalActiveProductionTasks ?? 0)}
            icon={Factory}
            accent="secondary"
            helper={`${formatNumber(production?.inProgressTasks ?? 0)} in progress · ${formatNumber(production?.pendingTasks ?? 0)} pending`}
          />
          <StatCard
            label="Units produced"
            value={formatQuantity(production?.productionQuantityCompletedInPeriod ?? 0)}
            icon={CheckCircle2}
            accent="success"
            helper="Completed in the selected period"
          />
          <StatCard
            label="Checked in today"
            value={`${formatNumber(employees?.checkedInToday ?? 0)}/${formatNumber(employees?.totalActiveEmployees ?? 0)}`}
            icon={Users}
            accent="accent"
            helper={`${formatPercent(attendanceRate)} of active staff · ${formatNumber(employees?.employeesCurrentlyAbsent ?? 0)} absent`}
          />
          <StatCard
            label="Overtime awaiting review"
            value={formatNumber(employees?.pendingOvertimeCount ?? 0)}
            icon={Clock}
            accent={employees?.pendingOvertimeCount ? "warning" : "success"}
            helper="Attendance records pending an overtime decision"
          />
          <StatCard
            label="Payroll outstanding"
            value={formatCurrency(payroll?.currentMonthRemainingBalance ?? 0, true)}
            icon={Wallet}
            accent={payroll?.currentMonthRemainingBalance ? "destructive" : "success"}
            helper={`${formatNumber(payroll?.unpaidEmployeesCount ?? 0)} unpaid · ${formatNumber(payroll?.partiallyPaidEmployeesCount ?? 0)} partially paid`}
          />
          <StatCard
            label="Unread notifications"
            value={formatNumber(notifications?.unreadCount ?? 0)}
            icon={Bell}
            accent="primary"
            helper="Across alerts, tasks and approvals"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ProductionMixChart production={production} isLoading={isLoading} className="xl:col-span-2" />
        <InventoryHealthChart inventory={inventory} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <PayrollProgressChart payroll={payroll} isLoading={isLoading} />

        <div className="xl:col-span-2">
          <ActivityTimeline movements={inventory?.recentStockMovements} isLoading={isLoading} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Latest notifications"
          description="Most recent alerts across the system"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/notifications">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {!notifications?.latestNotifications?.length ? (
            <EmptyState icon={Bell} title="Nothing new" description="You're all caught up." />
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.latestNotifications.map((n) => (
                <div key={n.id} className="border-border/60 flex items-start gap-3 rounded-xl border px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="text-muted-foreground line-clamp-1 text-xs">{n.message}</p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">{formatRelativeTime(n.createdAt)}</span>
                  {!n.isRead && <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />}
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Task pipeline" description="Where every production task currently sits">
          <div className="flex flex-col gap-4">
            {(
              [
                { label: "Pending", value: production?.pendingTasks ?? 0, tone: "bg-warning" },
                { label: "Accepted", value: production?.acceptedTasks ?? 0, tone: "bg-secondary" },
                { label: "In progress", value: production?.inProgressTasks ?? 0, tone: "bg-primary" },
                { label: "Partially completed", value: production?.partiallyCompletedTasks ?? 0, tone: "bg-accent" },
                { label: "Completed", value: production?.completedTasks ?? 0, tone: "bg-success" },
                { label: "Cancelled", value: production?.cancelledTasks ?? 0, tone: "bg-destructive" },
              ] as const
            ).map((row) => {
              const total =
                (production?.pendingTasks ?? 0) +
                (production?.acceptedTasks ?? 0) +
                (production?.inProgressTasks ?? 0) +
                (production?.partiallyCompletedTasks ?? 0) +
                (production?.completedTasks ?? 0) +
                (production?.cancelledTasks ?? 0);
              return (
                <div key={row.label} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="tabular font-semibold">{formatNumber(row.value)}</span>
                  </div>
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div className={`h-full rounded-full ${row.tone}`} style={{ width: `${percent(row.value, total)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Payroll this month" description={`Billing period ${payroll?.month ?? ""}/${payroll?.year ?? ""}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-muted/40 flex flex-col gap-1 rounded-xl p-4">
            <span className="text-muted-foreground text-xs">Total earned</span>
            <span className="tabular text-xl font-bold">{formatCurrency(payroll?.currentMonthTotalEarnings ?? 0)}</span>
          </div>
          <div className="bg-success-soft/40 flex flex-col gap-1 rounded-xl p-4">
            <span className="text-muted-foreground text-xs">Paid so far</span>
            <span className="tabular text-success text-xl font-bold">{formatCurrency(payroll?.currentMonthPaidAmount ?? 0)}</span>
          </div>
          <div className="bg-destructive-soft/40 flex flex-col gap-1 rounded-xl p-4">
            <span className="text-muted-foreground text-xs">Remaining balance</span>
            <span className="tabular text-destructive text-xl font-bold">{formatCurrency(payroll?.currentMonthRemainingBalance ?? 0)}</span>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Payroll settled</span>
            <Badge variant={payrollPaidRate >= 100 ? "success" : payrollPaidRate > 0 ? "warning" : "destructive"}>
              {formatPercent(payrollPaidRate)}
            </Badge>
          </div>
          <Progress value={payrollPaidRate} />
        </div>
      </ChartCard>
    </div>
  );
}
