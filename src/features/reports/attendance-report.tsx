"use client";

import * as React from "react";
import { CalendarCheck } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { DateRangePicker, currentMonthRange, type DateRange } from "@/components/shared/period-picker";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAttendanceReport } from "@/hooks/queries/use-reports";
import { useEmployeeOptions } from "@/hooks/queries/use-users";
import { reportsService } from "@/services/reports.service";
import { useAuthStore } from "@/store/auth-store";
import { percent } from "@/lib/calc";
import { formatHours, formatNumber, formatPercent } from "@/lib/utils";
import { DownloadButton, ReportToolbar, SummaryTile } from "./report-shell";

export function AttendanceReportView() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const [range, setRange] = React.useState<DateRange>(currentMonthRange);
  const [employeeId, setEmployeeId] = React.useState("all");
  const { employees } = useEmployeeOptions({ enabled: isAdmin });

  const valid = range.from <= range.to;
  const params = {
    from: valid ? range.from : undefined,
    to: valid ? range.to : undefined,
    employeeId: isAdmin && employeeId !== "all" ? employeeId : undefined,
  };

  const { data, isLoading, isError, error, refetch } = useAttendanceReport(params);
  const summary = data?.summary;

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar
        filters={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            {isAdmin && (
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
            )}
          </>
        }
        actions={
          <>
            <DownloadButton label="PDF" kind="pdf" download={() => reportsService.downloadAttendancePdf(params)} />
            <DownloadButton label="CSV" kind="csv" download={() => reportsService.exportAttendanceCsv(params)} />
          </>
        }
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading && !data ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Employees" value={formatNumber(summary?.totalEmployees ?? 0)} tone="primary" />
            <SummaryTile label="Days attended" value={formatNumber(summary?.totalDaysAttended ?? 0)} />
            <SummaryTile label="Hours worked" value={formatHours(summary?.totalWorkedHours ?? 0)} />
            <SummaryTile
              label="Approved overtime"
              value={formatHours(summary?.totalApprovedOvertime ?? 0)}
              tone="success"
            />
          </div>

          <ChartCard
            title="Per-employee summary"
            description={`${data?.period.from ?? ""} → ${data?.period.to ?? ""}`}
          >
            {!data?.employeeSummaries.length ? (
              <EmptyState icon={CalendarCheck} title="No attendance in this range" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-48">Employee</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead className="text-right">Worked</TableHead>
                      <TableHead className="text-right">Required</TableHead>
                      <TableHead className="min-w-28">Coverage</TableHead>
                      <TableHead className="text-right">Approved OT</TableHead>
                      <TableHead className="text-right">Pending OT</TableHead>
                      <TableHead className="text-right">Late</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.employeeSummaries.map((e) => {
                      const coverage = percent(e.workedHours, e.requiredHours);
                      return (
                        <TableRow key={e.employeeId}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <UserAvatar name={e.employeeName || e.email} size="size-8" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{e.employeeName || "Unnamed"}</p>
                                <p className="text-muted-foreground truncate text-xs">{e.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="tabular text-right text-sm">{formatNumber(e.daysAttended)}</TableCell>
                          <TableCell className="tabular text-right text-sm font-medium">
                            {formatHours(e.workedHours)}
                          </TableCell>
                          <TableCell className="tabular text-muted-foreground text-right text-sm">
                            {formatHours(e.requiredHours)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={coverage} className="h-1.5 w-14" />
                              <span className="tabular text-xs">{formatPercent(coverage)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="tabular text-success text-right text-sm">
                            {formatHours(e.approvedOvertimeHours)}
                          </TableCell>
                          <TableCell className="tabular text-warning text-right text-sm">
                            {formatHours(e.pendingOvertimeHours)}
                          </TableCell>
                          <TableCell className="tabular text-right text-sm">{formatNumber(e.lateOccurrences)}</TableCell>
                        </TableRow>
                      );
                    })}
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
