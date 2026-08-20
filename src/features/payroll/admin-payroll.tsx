"use client";

import * as React from "react";
import { toast } from "sonner";
import { Banknote, Download, FileText, Loader2, Search, Users, Wallet } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { MonthPicker, type Period } from "@/components/shared/period-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePayrollOverview, useSalaryPayments } from "@/hooks/queries/use-payroll";
import { payrollService } from "@/services/payroll.service";
import { getApiErrorMessage } from "@/lib/api-client";
import { percent } from "@/lib/calc";
import { formatDate, formatHours, formatMoney, formatMonth, formatPercent } from "@/lib/utils";
import { RecordPaymentDialog, UpdateRateDialog } from "./payroll-dialogs";
import type { PayrollSummary } from "@/types";

export function AdminPayroll({ period, onPeriodChange }: { period: Period; onPeriodChange: (p: Period) => void }) {
  const [search, setSearch] = React.useState("");
  const [paying, setPaying] = React.useState<PayrollSummary | null>(null);
  const [ratingEmployee, setRatingEmployee] = React.useState<PayrollSummary | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = usePayrollOverview(period);
  const { data: payments = [] } = useSalaryPayments({ year: period.year, month: period.month });

  const term = search.trim().toLowerCase();
  const summaries = (data?.summaries ?? []).filter(
    (s) => !term || (s.employee.name ?? "").toLowerCase().includes(term) || s.employee.email.toLowerCase().includes(term),
  );

  const totals = data?.totals;
  const settledPct = percent(totals?.totalPaid ?? 0, totals?.totalEarned ?? 0);

  const handleDownload = async (summary: PayrollSummary) => {
    setDownloadingId(summary.employee.id);
    try {
      await payrollService.downloadEmployeeStatement(
        summary.employee.id,
        { year: period.year, month: period.month },
        summary.employee.name ?? undefined,
      );
      toast.success("Statement downloaded");
    } catch (err) {
      toast.error("Couldn't download statement", { description: getApiErrorMessage(err) });
    } finally {
      setDownloadingId(null);
    }
  };

  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Billing period <span className="text-foreground font-medium">{formatMonth(period.year, period.month)}</span>
        </p>
        <MonthPicker value={period} onChange={onPeriodChange} />
      </div>

      {isLoading && !data ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total earned"
            value={formatMoney(totals?.totalEarned ?? 0)}
            icon={Wallet}
            accent="primary"
            helper={`${data?.summaries.length ?? 0} active employees`}
          />
          <StatCard
            label="Paid so far"
            value={formatMoney(totals?.totalPaid ?? 0)}
            icon={Banknote}
            accent="success"
            helper={`${formatPercent(settledPct)} of payroll settled`}
          />
          <StatCard
            label="Remaining balance"
            value={formatMoney(totals?.totalRemaining ?? 0)}
            icon={FileText}
            accent={totals?.totalRemaining ? "destructive" : "success"}
            helper="Still owed for this period"
          />
          <StatCard
            label="Overtime earnings"
            value={formatMoney(totals?.totalOvertimeEarnings ?? 0)}
            icon={Users}
            accent="accent"
            helper="From approved overtime only"
          />
        </div>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees…"
              className="pl-9"
            />
          </div>
        </div>

        {isLoading && !data ? (
          <TableSkeleton rows={6} />
        ) : summaries.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title={term ? "No matching employees" : "No payroll data"}
              description={term ? "Try a different search." : "Payroll appears once employees record attendance."}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48">Employee</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Overtime</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((s) => (
                  <TableRow key={s.employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={s.employee.name ?? s.employee.email} size="size-8" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{s.employee.name ?? "Unnamed"}</p>
                          <p className="text-muted-foreground truncate text-xs">{s.employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular text-right text-sm">{formatMoney(s.hourlyRate)}</TableCell>
                    <TableCell className="tabular text-right text-sm">{formatHours(s.regularHours)}</TableCell>
                    <TableCell className="text-right">
                      <p className="tabular text-sm">{formatHours(s.approvedOvertimeHours)}</p>
                      {s.pendingOvertimeHours > 0 && (
                        <p className="text-warning text-xs">{formatHours(s.pendingOvertimeHours)} pending</p>
                      )}
                    </TableCell>
                    <TableCell className="tabular text-right text-sm font-semibold">{formatMoney(s.totalEarned)}</TableCell>
                    <TableCell className="tabular text-success text-right text-sm">{formatMoney(s.salaryPaid)}</TableCell>
                    <TableCell className="tabular text-right text-sm font-semibold">
                      {formatMoney(s.remainingBalance)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Payroll actions">
                            {downloadingId === s.employee.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Wallet className="size-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPaying(s)} disabled={s.remainingBalance <= 0}>
                            <Banknote className="size-4" />
                            Record payment
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRatingEmployee(s)}>
                            <Wallet className="size-4" />
                            Update hourly rate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(s)}>
                            <Download className="size-4" />
                            Download statement
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Settlement progress" description="Paid against earned this period">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <span className="tabular text-3xl font-bold">{formatPercent(settledPct)}</span>
              <span className="text-muted-foreground text-xs">settled</span>
            </div>
            <Progress value={settledPct} />
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Regular earnings</span>
                <span className="tabular">{formatMoney(totals?.totalRegularEarnings ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overtime earnings</span>
                <span className="tabular">{formatMoney(totals?.totalOvertimeEarnings ?? 0)}</span>
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Payment history" description="Salary payments recorded this period" className="lg:col-span-2">
          {payments.length === 0 ? (
            <EmptyState icon={Banknote} title="No payments yet" description="Recorded payments will show up here." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Paid by</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-medium">{p.employee?.name ?? "—"}</TableCell>
                      <TableCell className="tabular text-right text-sm font-semibold">{formatMoney(p.amount)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.paidBy?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(p.createdAt)}</TableCell>
                      <TableCell className="text-muted-foreground max-w-40 truncate text-sm">{p.note ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ChartCard>
      </div>

      {paying && <RecordPaymentDialog summary={paying} open={!!paying} onOpenChange={(o) => !o && setPaying(null)} />}
      {ratingEmployee && (
        <UpdateRateDialog
          employeeId={ratingEmployee.employee.id}
          employeeName={ratingEmployee.employee.name ?? ratingEmployee.employee.email}
          currentRate={ratingEmployee.hourlyRate}
          open={!!ratingEmployee}
          onOpenChange={(o) => !o && setRatingEmployee(null)}
        />
      )}
    </div>
  );
}
