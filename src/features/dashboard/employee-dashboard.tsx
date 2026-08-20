"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Factory,
  LogIn,
  LogOut,
  Loader2,
  Wallet,
} from "lucide-react";
import { ChartCard, SectionHeader } from "@/components/shared/chart-card";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { TaskStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployeeDashboard } from "@/hooks/queries/use-dashboard";
import { useCheckIn, useCheckOut, useTodayStatus } from "@/hooks/queries/use-attendance";
import { useMyPayroll } from "@/hooks/queries/use-payroll";
import { useTasks } from "@/hooks/queries/use-tasks";
import { getApiErrorMessage } from "@/lib/api-client";
import { liveWorkedHours, num, percent, taskProgress } from "@/lib/calc";
import { formatCurrency, formatHours, formatMoney, formatPercent, formatQuantity, formatRelativeTime, formatTime } from "@/lib/utils";
import { payrollService } from "@/services/payroll.service";

/** Clock-in / clock-out card with a live hours-worked readout. */
function AttendanceCard() {
  const { data: today, isLoading } = useTodayStatus();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  // Ticks locally between refetches so the counter never looks frozen.
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!today?.checkedIn || today?.checkedOut) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [today]);

  const workedSoFar = React.useMemo(() => {
    if (!today?.checkIn) return 0;
    if (today.checkOut) return num(today.workedHours);
    void now; // re-derive on each tick
    return liveWorkedHours(today.checkIn, null);
  }, [today, now]);

  const required = today?.requiredHours ?? 8;
  const progress = percent(workedSoFar, required);
  const overtimeSoFar = Math.max(0, workedSoFar - required);

  const handleCheckIn = () =>
    checkIn.mutate(undefined, {
      onSuccess: () => toast.success("Checked in", { description: "Have a good shift." }),
      onError: (error) => toast.error("Couldn't check in", { description: getApiErrorMessage(error) }),
    });

  const handleCheckOut = () =>
    checkOut.mutate(undefined, {
      onSuccess: (record) =>
        toast.success("Checked out", {
          description: `${formatHours(record.workedHours)} worked today.`,
        }),
      onError: (error) => toast.error("Couldn't check out", { description: getApiErrorMessage(error) }),
    });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarCheck className="text-primary size-4" />
          Today&apos;s attendance
        </CardTitle>
        <CardDescription>
          {today?.checkedOut
            ? "Your shift is complete."
            : today?.checkedIn
              ? "You're currently clocked in."
              : "You haven't checked in yet today."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 flex flex-col gap-1 rounded-xl p-3">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <LogIn className="size-3.5" /> Check in
                </span>
                <span className="tabular text-lg font-semibold">{today?.checkIn ? formatTime(today.checkIn) : "—"}</span>
              </div>
              <div className="bg-muted/40 flex flex-col gap-1 rounded-xl p-3">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <LogOut className="size-3.5" /> Check out
                </span>
                <span className="tabular text-lg font-semibold">{today?.checkOut ? formatTime(today.checkOut) : "—"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatHours(workedSoFar)} of {formatHours(required)} required
                </span>
                <span className="tabular font-semibold">{formatPercent(progress)}</span>
              </div>
              <Progress value={progress} />
              {overtimeSoFar > 0 && (
                <p className="text-warning text-xs">
                  {formatHours(overtimeSoFar)}{" "}
                  beyond your required hours — overtime needs admin approval before it&apos;s paid.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleCheckIn}
                disabled={!!today?.checkedIn || checkIn.isPending}
              >
                {checkIn.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                Check in
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCheckOut}
                disabled={!today?.checkedIn || !!today?.checkedOut || checkOut.isPending}
              >
                {checkOut.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                Check out
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function EmployeeDashboard({ userName }: { userName?: string | null }) {
  const { data, isLoading, isError, error, refetch } = useEmployeeDashboard();
  const { data: payroll } = useMyPayroll();
  const { data: tasksData, isLoading: tasksLoading } = useTasks({ pageNo: 1, showPerPage: 6 });
  const [downloading, setDownloading] = React.useState(false);

  const activeTasks = React.useMemo(
    () => (tasksData?.tasks ?? []).filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"),
    [tasksData],
  );

  const handleDownloadStatement = async () => {
    if (!payroll) return;
    setDownloading(true);
    try {
      await payrollService.downloadMyStatement({ year: payroll.year, month: payroll.month });
      toast.success("Statement downloaded");
    } catch (err) {
      toast.error("Couldn't download statement", { description: getApiErrorMessage(err) });
    } finally {
      setDownloading(false);
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader title="My dashboard" description="Your tasks, attendance and pay at a glance." />
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={`Hi${userName ? `, ${userName.split(" ")[0]}` : ""}`}
        description="Your tasks, attendance and pay at a glance."
      />

      {isLoading && !data ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active tasks"
            value={String(data?.tasks.assignedActiveTasks ?? 0)}
            icon={Factory}
            accent="primary"
            helper="Assigned and not yet finished"
          />
          <StatCard
            label="Completed this period"
            value={String(data?.tasks.completedTasksInPeriod ?? 0)}
            icon={CheckCircle2}
            accent="success"
            helper="Tasks you finished"
          />
          <StatCard
            label="Earned this month"
            value={formatCurrency(data?.payroll.totalEarned ?? 0)}
            icon={Wallet}
            accent="accent"
            helper={`${formatCurrency(data?.payroll.totalPaid ?? 0)} paid so far`}
          />
          <StatCard
            label="Unpaid balance"
            value={formatCurrency(data?.payroll.remainingBalance ?? 0)}
            icon={Clock}
            accent={data?.payroll.remainingBalance ? "warning" : "success"}
            helper="Still to be paid for this month"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AttendanceCard />

        <ChartCard
          title="My tasks"
          description="What's on your plate right now"
          className="lg:col-span-2"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/operations">
                Open tasks <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {tasksLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : activeTasks.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No active tasks" description="New assignments will show up here." />
          ) : (
            <div className="flex flex-col gap-2">
              {activeTasks.map((task) => {
                const progress = taskProgress(task);
                return (
                  <Link
                    key={task.id}
                    href="/dashboard/operations"
                    className="border-border/60 hover:bg-muted/40 flex flex-col gap-2 rounded-xl border px-3 py-2.5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {task.product?.name ?? "—"} · {formatQuantity(progress.completed)}/{formatQuantity(progress.planned)}{" "}
                          {task.product?.unit ?? "units"}
                        </p>
                      </div>
                      <TaskStatusBadge status={task.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={progress.completionPercentage} className="h-1.5 flex-1" />
                      <span className="tabular text-muted-foreground w-10 text-right text-xs">
                        {formatPercent(progress.completionPercentage)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="This month's pay"
          description={payroll ? `Billing period ${payroll.month}/${payroll.year}` : "Current billing period"}
          action={
            <Button variant="outline" size="sm" onClick={handleDownloadStatement} disabled={!payroll || downloading}>
              {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              Statement
            </Button>
          }
        >
          {!payroll ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Status</span>
                <PaymentStatusBadge status={payroll.status} />
              </div>
              {(
                [
                  ["Regular hours", formatHours(payroll.regularHours)],
                  ["Regular earnings", formatMoney(payroll.regularEarnings)],
                  ["Approved overtime", formatHours(payroll.approvedOvertimeHours)],
                  ["Overtime earnings", formatMoney(payroll.overtimeEarnings)],
                  ["Total earned", formatMoney(payroll.totalEarned)],
                  ["Paid so far", formatMoney(payroll.salaryPaid)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="border-border/50 flex items-center justify-between border-b pb-2 text-sm last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular font-medium">{value}</span>
                </div>
              ))}
              <div className="bg-primary-soft/50 flex items-center justify-between rounded-xl px-3 py-2.5">
                <span className="text-sm font-medium">Remaining balance</span>
                <span className="tabular text-primary text-lg font-bold">{formatMoney(payroll.remainingBalance)}</span>
              </div>
              {payroll.pendingOvertimeHours > 0 && (
                <p className="text-muted-foreground text-xs">
                  {formatHours(payroll.pendingOvertimeHours)} of overtime is still awaiting admin approval and isn&apos;t
                  included above.
                </p>
              )}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Recent notifications"
          description="Updates for you"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/notifications">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {!data?.notifications.latestNotifications?.length ? (
            <EmptyState icon={Bell} title="Nothing new" description="You're all caught up." />
          ) : (
            <div className="flex flex-col gap-2">
              {data.notifications.latestNotifications.map((n) => (
                <div key={n.id} className="border-border/60 flex items-start gap-3 rounded-xl border px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="text-muted-foreground line-clamp-2 text-xs">{n.message}</p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">{formatRelativeTime(n.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
