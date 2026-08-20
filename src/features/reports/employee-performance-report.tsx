"use client";

import * as React from "react";
import { Award } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { DateRangePicker, currentMonthRange, type DateRange } from "@/components/shared/period-picker";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployeePerformanceReport } from "@/hooks/queries/use-reports";
import { useEmployeeOptions } from "@/hooks/queries/use-users";
import { reportsService } from "@/services/reports.service";
import { useAuthStore } from "@/store/auth-store";
import { percent } from "@/lib/calc";
import { formatHours, formatMoney, formatNumber, formatPercent, formatQuantity } from "@/lib/utils";
import { DownloadButton, ReportToolbar, SummaryTile } from "./report-shell";

export function EmployeePerformanceReportView() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  // Employees may only ever request their own id — the backend enforces this too.
  const [employeeId, setEmployeeId] = React.useState<string>(isAdmin ? "" : (user?.id ?? ""));
  const [range, setRange] = React.useState<DateRange>(currentMonthRange);

  const { employees } = useEmployeeOptions({ enabled: isAdmin });

  const valid = range.from <= range.to;
  const params = { from: valid ? range.from : undefined, to: valid ? range.to : undefined };

  const { data, isLoading, isError, error, refetch } = useEmployeePerformanceReport(employeeId || null, params);

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar
        filters={
          <>
            {isAdmin && (
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-xs">Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger className="h-9 w-56">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name ?? e.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DateRangePicker value={range} onChange={setRange} />
          </>
        }
        actions={
          <DownloadButton
            label="PDF"
            kind="pdf"
            disabled={!employeeId}
            download={() => reportsService.downloadEmployeePerformancePdf(employeeId, params)}
          />
        }
      />

      {!employeeId ? (
        <EmptyState icon={Award} title="Pick an employee" description="Choose someone to see their performance report." />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading && !data ? (
        <LoadingState label="Building performance report…" />
      ) : !data ? null : (
        <>
          <div className="bg-primary-soft/40 flex flex-wrap items-center gap-3 rounded-2xl p-4">
            <UserAvatar name={data.employee.name ?? data.employee.email} size="size-12" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{data.employee.name ?? "Unnamed"}</p>
              <p className="text-muted-foreground text-sm">{data.employee.email}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Period</p>
              <p className="text-sm font-medium">
                {data.period.from} → {data.period.to}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Attendance" description="Time on the clock">
              <div className="grid grid-cols-2 gap-3">
                <SummaryTile label="Days attended" value={formatNumber(data.attendance.daysAttended)} tone="primary" />
                <SummaryTile label="Hours worked" value={formatHours(data.attendance.totalWorkedHours)} />
                <SummaryTile
                  label="Approved overtime"
                  value={formatHours(data.attendance.approvedOvertimeHours)}
                  tone="success"
                />
                <SummaryTile
                  label="Late arrivals"
                  value={formatNumber(data.attendance.lateOccurrences)}
                  tone={data.attendance.lateOccurrences ? "warning" : "success"}
                />
              </div>
            </ChartCard>

            <ChartCard title="Production" description="Task output">
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <SummaryTile label="Assigned tasks" value={formatNumber(data.production.assignedTasks)} tone="primary" />
                  <SummaryTile label="Completed" value={formatNumber(data.production.completedTasks)} tone="success" />
                  <SummaryTile label="Planned qty" value={formatQuantity(data.production.plannedQuantity)} />
                  <SummaryTile label="Produced qty" value={formatQuantity(data.production.completedQuantity)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Completion rate</span>
                    <span className="tabular font-semibold">{formatPercent(data.production.completionRate, 1)}</span>
                  </div>
                  <Progress value={data.production.completionRate} />
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Payroll" description={`Billing period ${data.payroll.month}/${data.payroll.year}`}>
              <div className="flex flex-col gap-3">
                <SummaryTile label="Total earned" value={formatMoney(data.payroll.totalEarned)} tone="primary" />
                <SummaryTile label="Paid" value={formatMoney(data.payroll.paidAmount)} tone="success" />
                <SummaryTile
                  label="Remaining balance"
                  value={formatMoney(data.payroll.remainingBalance)}
                  tone={data.payroll.remainingBalance ? "destructive" : "success"}
                />
                <Progress value={percent(data.payroll.paidAmount, data.payroll.totalEarned)} />
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
