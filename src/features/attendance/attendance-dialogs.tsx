"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import { Loader2, PencilLine, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDecideOvertime, useOverrideAttendance } from "@/hooks/queries/use-attendance";
import { getApiErrorMessage } from "@/lib/api-client";
import { effectiveOvertime, hoursBetween, num, overtimeHours } from "@/lib/calc";
import { formatDate, formatHours, formatTime, toDateTimeLocalInput } from "@/lib/utils";
import type { Attendance, OvertimeStatus } from "@/types";

/** Approve, reject or edit the overtime hours on one attendance record. */
export function OvertimeDecisionDialog({
  record,
  open,
  onOpenChange,
}: {
  record: Attendance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const clocked = num(record.overtimeHours);
  const [hours, setHours] = React.useState(String(effectiveOvertime(record)));
  const [reason, setReason] = React.useState("");
  const decide = useDecideOvertime();

  useResetOnOpen(open, () => {
        setHours(String(effectiveOvertime(record)));
      setReason("");
  });

  const value = Number(hours);
  const valid = Number.isFinite(value) && value >= 0;
  const edited = valid && value !== clocked;

  const submit = (nextStatus: OvertimeStatus) => {
    decide.mutate(
      {
        id: record.id,
        payload: {
          status: nextStatus,
          // Only send an override when the admin actually changed the figure.
          adminOvertimeHours: edited ? value : undefined,
          reason: reason.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            nextStatus === "APPROVED" ? "Overtime approved" : nextStatus === "REJECTED" ? "Overtime rejected" : "Overtime updated",
          );
          onOpenChange(false);
        },
        onError: (error) => toast.error("Couldn't update overtime", { description: getApiErrorMessage(error) }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review overtime</DialogTitle>
          <DialogDescription>
            {record.employee?.name ?? "Employee"} · {formatDate(record.date)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="bg-muted/40 flex flex-col gap-1.5 rounded-xl p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Worked</span>
              <span className="tabular font-medium">{formatHours(record.workedHours)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required</span>
              <span className="tabular font-medium">{formatHours(record.requiredHours)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Clocked overtime</span>
              <span className="tabular font-medium">{formatHours(clocked)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Punches</span>
              <span className="tabular font-medium">
                {formatTime(record.checkIn)} → {formatTime(record.checkOut)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ot-hours">Overtime hours to credit</Label>
            <Input
              id="ot-hours"
              type="number"
              min={0}
              step="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            {!valid && hours !== "" && <p className="text-destructive text-xs">Hours can&apos;t be negative.</p>}
            {edited && (
              <p className="text-muted-foreground text-xs">
                Adjusted from the clocked {formatHours(clocked)} — the credited figure is what payroll uses.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ot-reason">Reason</Label>
            <Textarea
              id="ot-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional note for the employee"
            />
          </div>

          <p className="text-muted-foreground text-xs">
            Only approved overtime is paid. The employee is notified of your decision.
          </p>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={decide.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => submit("REJECTED")} disabled={decide.isPending}>
            {decide.isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
            Reject
          </Button>
          <Button onClick={() => submit("APPROVED")} disabled={!valid || decide.isPending}>
            {decide.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Corrects check-in / check-out times, preserving an audit trail server-side. */
export function AttendanceOverrideDialog({
  record,
  open,
  onOpenChange,
}: {
  record: Attendance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const override = useOverrideAttendance();

  useResetOnOpen(open, () => {
      setCheckIn(toDateTimeLocalInput(record.checkIn));
      setCheckOut(toDateTimeLocalInput(record.checkOut));
      setReason("");
      setNotes(record.notes ?? "");
  });

  const outOfOrder = !!checkIn && !!checkOut && new Date(checkOut) < new Date(checkIn);
  const canSubmit = reason.trim().length > 0 && !outOfOrder;

  // Live preview of the hours the correction would produce.
  const previewWorked = checkIn && checkOut && !outOfOrder ? hoursBetween(checkIn, checkOut) : 0;
  const previewOvertime = overtimeHours(previewWorked, num(record.requiredHours, 8));

  const handleSubmit = () =>
    override.mutate(
      {
        id: record.id,
        payload: {
          checkIn: checkIn ? new Date(checkIn).toISOString() : undefined,
          checkOut: checkOut ? new Date(checkOut).toISOString() : undefined,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Attendance corrected", { description: "The original values are kept in the audit log." });
          onOpenChange(false);
        },
        onError: (error) => toast.error("Couldn't correct attendance", { description: getApiErrorMessage(error) }),
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Correct attendance</DialogTitle>
          <DialogDescription>
            {record.employee?.name ?? "Employee"} · {formatDate(record.date)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="override-in">Check in</Label>
              <Input id="override-in" type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="override-out">Check out</Label>
              <Input id="override-out" type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>

          {outOfOrder && <p className="text-destructive text-xs">Check-out can&apos;t be earlier than check-in.</p>}

          {previewWorked > 0 && (
            <div className="bg-muted/40 flex items-center justify-between rounded-xl p-3 text-sm">
              <span className="text-muted-foreground">Recalculated</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary">{formatHours(previewWorked)} worked</Badge>
                {previewOvertime > 0 && <Badge variant="warning">{formatHours(previewOvertime)} overtime</Badge>}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-reason">Reason for correction *</Label>
            <Textarea
              id="override-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Employee forgot to check out"
            />
            {reason.trim().length === 0 && (
              <p className="text-muted-foreground text-xs">Required — the reason is stored in the audit log.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-notes">Notes</Label>
            <Textarea id="override-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={override.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || override.isPending}>
            {override.isPending ? <Loader2 className="size-4 animate-spin" /> : <PencilLine className="size-4" />}
            Save correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
