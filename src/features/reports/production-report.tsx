"use client";

import * as React from "react";
import { Factory } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { TaskStatusBadge } from "@/components/shared/status-badges";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { DateRangePicker, currentMonthRange, type DateRange } from "@/components/shared/period-picker";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProductionReport } from "@/hooks/queries/use-reports";
import { useEmployeeOptions } from "@/hooks/queries/use-users";
import { reportsService } from "@/services/reports.service";
import { useAuthStore } from "@/store/auth-store";
import { taskProgress } from "@/lib/calc";
import { formatDate, formatNumber, formatPercent, formatQuantity } from "@/lib/utils";
import { DownloadButton, ReportToolbar, SummaryTile } from "./report-shell";
import type { TaskStatus } from "@/types";

export function ProductionReportView() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const [range, setRange] = React.useState<DateRange>(currentMonthRange);
  const [status, setStatus] = React.useState<TaskStatus | "all">("all");
  const [employeeId, setEmployeeId] = React.useState("all");

  const { employees } = useEmployeeOptions({ enabled: isAdmin });

  const valid = range.from <= range.to;
  const params = {
    from: valid ? range.from : undefined,
    to: valid ? range.to : undefined,
    status: status === "all" ? undefined : status,
    // Employees are scoped to themselves by the backend regardless.
    employeeId: isAdmin && employeeId !== "all" ? employeeId : undefined,
  };

  const { data, isLoading, isError, error, refetch } = useProductionReport(params);
  const summary = data?.summary;

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar
        filters={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus | "all")}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                  <SelectItem value="PARTIALLY_COMPLETED">Partially completed</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <DownloadButton label="PDF" kind="pdf" download={() => reportsService.downloadProductionPdf(params)} />
            <DownloadButton label="CSV" kind="csv" download={() => reportsService.exportProductionCsv(params)} />
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
            <SummaryTile label="Total tasks" value={formatNumber(summary?.totalTasks ?? 0)} tone="primary" />
            <SummaryTile label="Completed" value={formatNumber(summary?.completedTasks ?? 0)} tone="success" />
            <SummaryTile label="Partial" value={formatNumber(summary?.partiallyCompletedTasks ?? 0)} tone="warning" />
            <SummaryTile label="Cancelled" value={formatNumber(summary?.cancelledTasks ?? 0)} tone="destructive" />
            <SummaryTile label="Units planned" value={formatQuantity(summary?.totalPlannedQuantity ?? 0)} />
            <SummaryTile label="Units produced" value={formatQuantity(summary?.totalCompletedQuantity ?? 0)} tone="success" />
          </div>

          <ChartCard title="Overall completion" description="Produced against planned quantity for the period">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="tabular text-3xl font-bold">{formatPercent(summary?.completionPercentage ?? 0, 1)}</span>
                <span className="text-muted-foreground text-sm">
                  {formatQuantity(summary?.totalCompletedQuantity ?? 0)} of{" "}
                  {formatQuantity(summary?.totalPlannedQuantity ?? 0)} units
                </span>
              </div>
              <Progress value={summary?.completionPercentage ?? 0} />
              <p className="text-muted-foreground text-xs">
                {formatQuantity(summary?.totalRemainingQuantity ?? 0)} units still outstanding.
              </p>
            </div>
          </ChartCard>

          {isAdmin && (
            <ChartCard title="By employee" description="Output per person for this period">
              {!data?.employeeSummaries.length ? (
                <EmptyState title="No assigned production" description="No tasks were assigned in this range." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-48">Employee</TableHead>
                        <TableHead className="text-right">Tasks</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead className="text-right">Planned qty</TableHead>
                        <TableHead className="text-right">Produced qty</TableHead>
                        <TableHead className="min-w-32">Completion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.employeeSummaries.map((e) => (
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
                          <TableCell className="tabular text-right text-sm">{formatNumber(e.assignedTasks)}</TableCell>
                          <TableCell className="tabular text-right text-sm">{formatNumber(e.completedTasks)}</TableCell>
                          <TableCell className="tabular text-right text-sm">{formatQuantity(e.plannedQty)}</TableCell>
                          <TableCell className="tabular text-right text-sm font-medium">
                            {formatQuantity(e.completedQty)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={e.completionPercentage} className="h-1.5 w-16" />
                              <span className="tabular text-xs">{formatPercent(e.completionPercentage, 1)}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ChartCard>
          )}

          <ChartCard title="Tasks" description={`${formatNumber(data?.tasks.length ?? 0)} tasks in this report`}>
            {!data?.tasks.length ? (
              <EmptyState icon={Factory} title="No tasks in this range" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-48">Task</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Planned</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="min-w-32">Progress</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tasks.map((t) => {
                      const p = taskProgress(t);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm font-medium">{t.title}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{t.product?.name ?? "—"}</TableCell>
                          <TableCell className="tabular text-right text-sm">{formatQuantity(p.planned)}</TableCell>
                          <TableCell className="tabular text-right text-sm">{formatQuantity(p.completed)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={p.completionPercentage} className="h-1.5 w-16" />
                              <span className="tabular text-xs">{formatPercent(p.completionPercentage)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDate(t.createdAt)}</TableCell>
                          <TableCell>
                            <TaskStatusBadge status={t.status} />
                          </TableCell>
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
