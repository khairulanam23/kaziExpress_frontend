"use client";

import * as React from "react";
import { Wallet } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { MonthPicker, currentPeriod, type Period } from "@/components/shared/period-picker";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePayrollReport } from "@/hooks/queries/use-reports";
import { useEmployeeOptions } from "@/hooks/queries/use-users";
import { reportsService } from "@/services/reports.service";
import { percent } from "@/lib/calc";
import { formatHours, formatMoney, formatNumber, formatPercent } from "@/lib/utils";
import { DownloadButton, ReportToolbar, SummaryTile } from "./report-shell";

export function PayrollReportView() {
  const [period, setPeriod] = React.useState<Period>(currentPeriod);
  const [employeeId, setEmployeeId] = React.useState("all");
  const { employees } = useEmployeeOptions();

  const params = {
    year: period.year,
    month: period.month,
    employeeId: employeeId === "all" ? undefined : employeeId,
  };

  const { data, isLoading, isError, error, refetch } = usePayrollReport(params);
  const summary = data?.summary;
  const settled = percent(summary?.totalPaid ?? 0, summary?.totalEarned ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar
        filters={
          <>
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground text-xs">Billing month</Label>
              <MonthPicker value={period} onChange={setPeriod} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground text-xs">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-9 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name ?? e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        }
        actions={
          <>
            <DownloadButton label="PDF" kind="pdf" download={() => reportsService.downloadPayrollPdf(params)} />
            <DownloadButton label="CSV" kind="csv" download={() => reportsService.exportPayrollCsv(params)} />
          </>
        }
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading && !data ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <SummaryTile label="Employees" value={formatNumber(summary?.totalEmployees ?? 0)} tone="primary" />
            <SummaryTile label="Total earned" value={formatMoney(summary?.totalEarned ?? 0)} />
            <SummaryTile label="Total paid" value={formatMoney(summary?.totalPaid ?? 0)} tone="success" />
            <SummaryTile
              label="Remaining"
              value={formatMoney(summary?.totalRemaining ?? 0)}
              tone={summary?.totalRemaining ? "destructive" : "success"}
            />
            <SummaryTile label="Overtime pay" value={formatMoney(summary?.totalApprovedOvertimeEarnings ?? 0)} />
            <SummaryTile
              label="Fully paid"
              value={`${formatNumber(summary?.fullyPaidEmployees ?? 0)}/${formatNumber(summary?.totalEmployees ?? 0)}`}
              tone="success"
            />
          </div>

          <ChartCard title="Settlement" description="How much of this month's payroll has been paid">
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="tabular text-3xl font-bold">{formatPercent(settled)}</span>
                <span className="text-muted-foreground text-sm">
                  {formatMoney(summary?.totalPaid ?? 0)} of {formatMoney(summary?.totalEarned ?? 0)}
                </span>
              </div>
              <Progress value={settled} />
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">Unpaid</span>
                  <span className="tabular text-destructive font-semibold">
                    {formatNumber(summary?.unpaidEmployees ?? 0)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">Partially paid</span>
                  <span className="tabular text-warning font-semibold">
                    {formatNumber(summary?.partiallyPaidEmployees ?? 0)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">Fully paid</span>
                  <span className="tabular text-success font-semibold">
                    {formatNumber(summary?.fullyPaidEmployees ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Employee breakdown" description="Earnings and payments per person">
            {!data?.employeeBreakdown.length ? (
              <EmptyState icon={Wallet} title="No payroll data for this month" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-48">Employee</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Regular</TableHead>
                      <TableHead className="text-right">OT hrs</TableHead>
                      <TableHead className="text-right">OT pay</TableHead>
                      <TableHead className="text-right">Earned</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.employeeBreakdown.map((e) => (
                      <TableRow key={e.employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <UserAvatar name={e.employee.name ?? e.employee.email} size="size-8" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{e.employee.name ?? "Unnamed"}</p>
                              <p className="text-muted-foreground truncate text-xs">{e.employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="tabular text-right text-sm">{formatMoney(e.hourlyRate)}</TableCell>
                        <TableCell className="tabular text-right text-sm">{formatHours(e.workedHours)}</TableCell>
                        <TableCell className="tabular text-right text-sm">{formatMoney(e.regularEarnings)}</TableCell>
                        <TableCell className="tabular text-right text-sm">
                          {formatHours(e.approvedOvertimeHours)}
                        </TableCell>
                        <TableCell className="tabular text-right text-sm">{formatMoney(e.overtimeEarnings)}</TableCell>
                        <TableCell className="tabular text-right text-sm font-semibold">
                          {formatMoney(e.totalEarned)}
                        </TableCell>
                        <TableCell className="tabular text-success text-right text-sm">{formatMoney(e.totalPaid)}</TableCell>
                        <TableCell className="tabular text-right text-sm font-medium">
                          {formatMoney(e.remainingBalance)}
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={e.paymentStatus} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}
