"use client";

import * as React from "react";
import { toast } from "sonner";
import { Banknote, Clock, Download, Loader2, Wallet } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { MonthPicker, type Period } from "@/components/shared/period-picker";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyPayroll, useSalaryPayments } from "@/hooks/queries/use-payroll";
import { payrollService } from "@/services/payroll.service";
import { getApiErrorMessage } from "@/lib/api-client";
import { percent } from "@/lib/calc";
import { formatDate, formatHours, formatMoney, formatMonth, formatPercent } from "@/lib/utils";

export function EmployeePayroll({ period, onPeriodChange }: { period: Period; onPeriodChange: (p: Period) => void }) {
  const { data, isLoading, isError, error, refetch } = useMyPayroll(period);
  const { data: payments = [] } = useSalaryPayments({ year: period.year, month: period.month });
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await payrollService.downloadMyStatement(period);
      toast.success("Statement downloaded");
    } catch (err) {
      toast.error("Couldn't download statement", { description: getApiErrorMessage(err) });
    } finally {
      setDownloading(false);
    }
  };

  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const settledPct = percent(data?.salaryPaid ?? 0, data?.totalEarned ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Billing period <span className="text-foreground font-medium">{formatMonth(period.year, period.month)}</span>
        </p>
        <div className="flex items-center gap-2">
          <MonthPicker value={period} onChange={onPeriodChange} />
          <Button variant="outline" onClick={handleDownload} disabled={downloading || !data}>
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            <span className="hidden sm:inline">Statement</span>
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total earned"
            value={formatMoney(data?.totalEarned ?? 0)}
            icon={Wallet}
            accent="primary"
            helper={`${formatHours(data?.workedHoursTotal ?? 0)} worked across ${data?.attendanceCount ?? 0} days`}
          />
          <StatCard
            label="Paid so far"
            value={formatMoney(data?.salaryPaid ?? 0)}
            icon={Banknote}
            accent="success"
            helper={`${formatPercent(settledPct)} of what you've earned`}
          />
          <StatCard
            label="Remaining balance"
            value={formatMoney(data?.remainingBalance ?? 0)}
            icon={Clock}
            accent={data?.remainingBalance ? "warning" : "success"}
            helper="Still to be paid to you"
          />
          <StatCard
            label="Approved overtime"
            value={formatHours(data?.approvedOvertimeHours ?? 0)}
            icon={Clock}
            accent="accent"
            helper={
              data?.pendingOvertimeHours
                ? `${formatHours(data.pendingOvertimeHours)} still awaiting approval`
                : "All overtime reviewed"
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Earnings breakdown"
          description="How your pay for this period was calculated"
          action={data ? <PaymentStatusBadge status={data.status} /> : undefined}
        >
          {!data ? (
            <EmptyState icon={Wallet} title="No payroll data" description="Nothing recorded for this period yet." />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-sm">Regular hours</TableCell>
                      <TableCell className="tabular text-right text-sm">{formatHours(data.regularHours)}</TableCell>
                      <TableCell className="tabular text-right text-sm">{formatMoney(data.hourlyRate)}</TableCell>
                      <TableCell className="tabular text-right text-sm font-medium">
                        {formatMoney(data.regularEarnings)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm">
                        Approved overtime
                        <span className="text-muted-foreground ml-1 text-xs">(×{data.overtimeMultiplier})</span>
                      </TableCell>
                      <TableCell className="tabular text-right text-sm">
                        {formatHours(data.approvedOvertimeHours)}
                      </TableCell>
                      <TableCell className="tabular text-right text-sm">{formatMoney(data.overtimeRate)}</TableCell>
                      <TableCell className="tabular text-right text-sm font-medium">
                        {formatMoney(data.overtimeEarnings)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total earned</span>
                  <span className="tabular font-bold">{formatMoney(data.totalEarned)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Paid so far</span>
                  <span className="tabular text-success">− {formatMoney(data.salaryPaid)}</span>
                </div>
                <div className="bg-primary-soft/50 flex items-center justify-between rounded-xl px-3 py-2.5">
                  <span className="text-sm font-medium">Remaining balance</span>
                  <span className="tabular text-primary text-lg font-bold">{formatMoney(data.remainingBalance)}</span>
                </div>
                <Progress value={settledPct} className="mt-1" />
              </div>

              {data.pendingOvertimeHours > 0 && (
                <p className="border-warning/30 bg-warning-soft/40 rounded-xl border p-2.5 text-xs">
                  {formatHours(data.pendingOvertimeHours)} of overtime is waiting on admin approval. It isn&apos;t included
                  in the totals above and will be added once approved.
                </p>
              )}
              {data.rejectedOvertimeHours > 0 && (
                <p className="text-muted-foreground text-xs">
                  {formatHours(data.rejectedOvertimeHours)} of overtime was not approved for this period.
                </p>
              )}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Payment history" description="Payments recorded against this period">
          {payments.length === 0 ? (
            <EmptyState icon={Banknote} title="No payments yet" description="Payments appear here once recorded." />
          ) : (
            <div className="flex flex-col gap-2">
              {payments.map((p) => (
                <div key={p.id} className="border-border/60 flex items-center gap-3 rounded-xl border px-3 py-2.5">
                  <span className="bg-success-soft text-success flex size-9 items-center justify-center rounded-lg">
                    <Banknote className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="tabular text-sm font-semibold">{formatMoney(p.amount)}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatDate(p.createdAt)}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                  {p.paidBy?.name && <span className="text-muted-foreground text-xs">by {p.paidBy.name}</span>}
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
