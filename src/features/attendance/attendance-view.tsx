"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import {
  CalendarCheck,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MoreHorizontal,
  PencilLine,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { OvertimeStatusBadge } from "@/components/shared/status-badges";
import { Pagination } from "@/components/shared/pagination";
import { DateRangePicker, currentMonthRange, type DateRange } from "@/components/shared/period-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useAttendance,
  useCheckIn,
  useCheckOut,
  useRequiredHours,
  useSetRequiredHours,
  useTodayStatus,
} from "@/hooks/queries/use-attendance";
import { useEmployeeOptions } from "@/hooks/queries/use-users";
import { useAuthStore } from "@/store/auth-store";
import { getApiErrorMessage } from "@/lib/api-client";
import { attendanceTotals, effectiveOvertime, liveWorkedHours, num, percent } from "@/lib/calc";
import { formatDate, formatHours, formatPercent, formatTime } from "@/lib/utils";
import { AttendanceOverrideDialog, OvertimeDecisionDialog } from "./attendance-dialogs";
import type { Attendance, OvertimeStatus } from "@/types";

const PAGE_SIZE = 15;

// ── Personal clock ─────────────────────────────────────────────────────────
function ClockCard() {
  const { data: today, isLoading } = useTodayStatus();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!today?.checkedIn || today?.checkedOut) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [today]);

  const worked = React.useMemo(() => {
    if (!today?.checkIn) return 0;
    if (today.checkOut) return num(today.workedHours);
    void now;
    return liveWorkedHours(today.checkIn, null);
  }, [today, now]);

  const required = today?.requiredHours ?? 8;
  const overtime = Math.max(0, worked - required);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="text-primary size-4" />
          My clock
        </CardTitle>
        <CardDescription>
          {today?.checkedOut ? "Shift complete for today." : today?.checkedIn ? "You're clocked in." : "Not checked in yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <div className="bg-muted h-24 animate-pulse rounded-xl" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/40 flex flex-col gap-0.5 rounded-xl p-2.5">
                <span className="text-muted-foreground text-xs">In</span>
                <span className="tabular text-sm font-semibold">{today?.checkIn ? formatTime(today.checkIn) : "—"}</span>
              </div>
              <div className="bg-muted/40 flex flex-col gap-0.5 rounded-xl p-2.5">
                <span className="text-muted-foreground text-xs">Out</span>
                <span className="tabular text-sm font-semibold">{today?.checkOut ? formatTime(today.checkOut) : "—"}</span>
              </div>
              <div className="bg-muted/40 flex flex-col gap-0.5 rounded-xl p-2.5">
                <span className="text-muted-foreground text-xs">Worked</span>
                <span className="tabular text-sm font-semibold">{formatHours(worked)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Progress value={percent(worked, required)} />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>{formatHours(required)} required</span>
                {overtime > 0 && <span className="text-warning">{formatHours(overtime)} overtime (pending approval)</span>}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() =>
                  checkIn.mutate(undefined, {
                    onSuccess: () => toast.success("Checked in"),
                    onError: (e) => toast.error("Couldn't check in", { description: getApiErrorMessage(e) }),
                  })
                }
                disabled={!!today?.checkedIn || checkIn.isPending}
              >
                {checkIn.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                Check in
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  checkOut.mutate(undefined, {
                    onSuccess: (r) => toast.success("Checked out", { description: `${formatHours(r.workedHours)} worked.` }),
                    onError: (e) => toast.error("Couldn't check out", { description: getApiErrorMessage(e) }),
                  })
                }
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

// ── Required-hours config (admin) ──────────────────────────────────────────
function RequiredHoursDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: current = 8 } = useRequiredHours();
  const setHours = useSetRequiredHours();
  const [value, setValue] = React.useState(String(current));

  useResetOnOpen(open, () => setValue(String(current)));

  const hours = Number(value);
  const valid = Number.isFinite(hours) && hours > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Required working hours</DialogTitle>
          <DialogDescription>Daily hours before overtime starts accruing.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="required-hours">Hours per day</Label>
          <Input
            id="required-hours"
            type="number"
            min={0.5}
            step="0.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {!valid && value !== "" && <p className="text-destructive text-xs">Must be greater than 0.</p>}
          <p className="text-muted-foreground text-xs">
            Applies to future check-ins. Existing records keep the value they were created with.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={setHours.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              setHours.mutate(hours, {
                onSuccess: () => {
                  toast.success("Required hours updated");
                  onOpenChange(false);
                },
                onError: (e) => toast.error("Couldn't update", { description: getApiErrorMessage(e) }),
              })
            }
            disabled={!valid || setHours.isPending}
          >
            {setHours.isPending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────
export function AttendanceView() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const [range, setRange] = React.useState<DateRange>(currentMonthRange);
  const [employeeId, setEmployeeId] = React.useState<string>("all");
  const [otFilter, setOtFilter] = React.useState<OvertimeStatus | "all">("all");
  const [page, setPage] = React.useState(1);

  const [decidingRecord, setDecidingRecord] = React.useState<Attendance | null>(null);
  const [overridingRecord, setOverridingRecord] = React.useState<Attendance | null>(null);
  const [hoursOpen, setHoursOpen] = React.useState(false);

  const { employees } = useEmployeeOptions({ enabled: isAdmin });
  const { data: requiredHours } = useRequiredHours();

  const validRange = range.from <= range.to;

  const { data, isLoading, isError, error, refetch } = useAttendance({
    from: validRange ? range.from : undefined,
    to: validRange ? range.to : undefined,
    employeeId: isAdmin && employeeId !== "all" ? employeeId : undefined,
    overtimeStatus: otFilter === "all" ? undefined : otFilter,
    pageNo: page,
    showPerPage: PAGE_SIZE,
  });

  const records = React.useMemo(() => data?.records ?? [], [data]);
  // Totals cover the rows on screen; the backend's report endpoints own the
  // authoritative period aggregates.
  const totals = React.useMemo(() => attendanceTotals(records), [records]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ClockCard />

        {isLoading && !data ? (
          <div className="lg:col-span-2">
            <CardGridSkeleton count={4} className="xl:grid-cols-2" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            <StatCard
              label="Days attended"
              value={String(totals.daysAttended)}
              icon={CalendarCheck}
              accent="primary"
              helper="In the rows shown"
            />
            <StatCard
              label="Hours worked"
              value={formatHours(totals.workedHours)}
              icon={Clock}
              accent="secondary"
              helper={`${formatHours(totals.requiredHours)} required`}
            />
            <StatCard
              label="Approved overtime"
              value={formatHours(totals.approvedOvertimeHours)}
              icon={ShieldCheck}
              accent="success"
              helper={`${formatHours(totals.pendingOvertimeHours)} awaiting review`}
            />
            <StatCard
              label="Attendance rate"
              value={formatPercent(percent(totals.workedHours, totals.requiredHours))}
              icon={Users}
              accent="accent"
              helper="Worked against required hours"
            />
          </div>
        )}
      </div>

      <ChartCard
        title="Attendance records"
        description={isAdmin ? "Everyone's punches, overtime and corrections." : "Your attendance history."}
        action={
          isAdmin ? (
            <Button variant="outline" size="sm" onClick={() => setHoursOpen(true)}>
              <Settings2 className="size-3.5" />
              {formatHours(requiredHours ?? 8)}/day
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <DateRangePicker
              value={range}
              onChange={(r) => {
                setRange(r);
                setPage(1);
              }}
            />

            {isAdmin && (
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-xs">Employee</Label>
                <Select
                  value={employeeId}
                  onValueChange={(v) => {
                    setEmployeeId(v);
                    setPage(1);
                  }}
                >
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

            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground text-xs">Overtime</Label>
              <Select
                value={otFilter}
                onValueChange={(v) => {
                  setOtFilter(v as OvertimeStatus | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Awaiting review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isError ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : isLoading && !data ? (
            <TableSkeleton rows={6} />
          ) : records.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No attendance records"
              description="Nothing was recorded in this date range."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      {isAdmin && <TableHead className="min-w-40">Employee</TableHead>}
                      <TableHead>In</TableHead>
                      <TableHead>Out</TableHead>
                      <TableHead className="text-right">Worked</TableHead>
                      <TableHead className="text-right">Required</TableHead>
                      <TableHead className="text-right">Overtime</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => {
                      const ot = effectiveOvertime(r);
                      const edited = r.adminOvertimeHours !== null && r.adminOvertimeHours !== undefined;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">
                            {formatDate(r.date)}
                            {r.isOverride && (
                              <Badge variant="muted" className="ml-1.5">
                                <PencilLine />
                                Corrected
                              </Badge>
                            )}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <UserAvatar name={r.employee?.name ?? r.employee?.email ?? "?"} size="size-7" />
                                <span className="truncate text-sm">{r.employee?.name ?? "—"}</span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="tabular text-sm">{formatTime(r.checkIn)}</TableCell>
                          <TableCell className="tabular text-sm">{formatTime(r.checkOut)}</TableCell>
                          <TableCell className="tabular text-right text-sm font-medium">
                            {formatHours(r.workedHours)}
                          </TableCell>
                          <TableCell className="tabular text-muted-foreground text-right text-sm">
                            {formatHours(r.requiredHours)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="tabular text-sm">{formatHours(ot)}</span>
                            {edited && <p className="text-muted-foreground text-xs">edited</p>}
                          </TableCell>
                          <TableCell>
                            {ot > 0 || r.overtimeStatus !== "PENDING" ? (
                              <OvertimeStatusBadge status={r.overtimeStatus} />
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" aria-label="Attendance actions">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setDecidingRecord(r)}>
                                    <ShieldCheck className="size-4" />
                                    Review overtime
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setOverridingRecord(r)}>
                                    <PencilLine className="size-4" />
                                    Correct punches
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                page={page}
                pageCount={data?.totalPages ?? 1}
                onPageChange={setPage}
                totalItems={data?.totalData ?? 0}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
        </div>
      </ChartCard>

      {decidingRecord && (
        <OvertimeDecisionDialog
          record={decidingRecord}
          open={!!decidingRecord}
          onOpenChange={(o) => !o && setDecidingRecord(null)}
        />
      )}
      {overridingRecord && (
        <AttendanceOverrideDialog
          record={overridingRecord}
          open={!!overridingRecord}
          onOpenChange={(o) => !o && setOverridingRecord(null)}
        />
      )}
      <RequiredHoursDialog open={hoursOpen} onOpenChange={setHoursOpen} />
    </div>
  );
}
