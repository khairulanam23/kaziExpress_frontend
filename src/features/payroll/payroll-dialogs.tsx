"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import { Banknote, Loader2, Wallet } from "lucide-react";
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
import { useCreateSalaryPayment, useUpdateHourlyRate } from "@/hooks/queries/use-payroll";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatMoney, formatMonth } from "@/lib/utils";
import type { PayrollSummary } from "@/types";

/**
 * Records a salary payment. The amount is validated against the same
 * `remainingBalance` the backend enforces, so over-payments are caught before
 * the request is sent — but the server remains the authority.
 */
export function RecordPaymentDialog({
  summary,
  open,
  onOpenChange,
}: {
  summary: PayrollSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const createPayment = useCreateSalaryPayment();

  useResetOnOpen(open, () => {
      setAmount(summary.remainingBalance > 0 ? String(summary.remainingBalance) : "");
      setNote("");
  });

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;
  const exceeds = valid && value > summary.remainingBalance;
  const nothingOwed = summary.remainingBalance <= 0;

  const handleSubmit = () => {
    createPayment.mutate(
      {
        employeeId: summary.employee.id,
        year: summary.year,
        month: summary.month,
        amount: value,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          toast.success("Payment recorded", {
            description: `${formatMoney(result.summary.remainingBalance)} still outstanding.`,
          });
          onOpenChange(false);
        },
        onError: (error) => toast.error("Couldn't record payment", { description: getApiErrorMessage(error) }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record salary payment</DialogTitle>
          <DialogDescription>
            {summary.employee.name ?? summary.employee.email} · {formatMonth(summary.year, summary.month)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="bg-muted/40 flex flex-col gap-1.5 rounded-xl p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total earned</span>
              <span className="tabular font-medium">{formatMoney(summary.totalEarned)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Already paid</span>
              <span className="tabular font-medium">{formatMoney(summary.salaryPaid)}</span>
            </div>
            <div className="border-border/60 flex justify-between border-t pt-1.5">
              <span className="font-medium">Remaining balance</span>
              <span className="tabular text-primary font-bold">{formatMoney(summary.remainingBalance)}</span>
            </div>
          </div>

          {nothingOwed ? (
            <div className="border-success/25 bg-success-soft/40 rounded-xl border p-3 text-sm">
              This employee is fully paid for {formatMonth(summary.year, summary.month)}.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="payment-amount">Amount *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min={0.01}
                  max={summary.remainingBalance}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {amount !== "" && !valid && <p className="text-destructive text-xs">Enter an amount greater than 0.</p>}
                {exceeds && (
                  <p className="text-destructive text-xs">
                    That exceeds the remaining balance of {formatMoney(summary.remainingBalance)}.
                  </p>
                )}
                <div className="flex gap-1.5">
                  {[0.25, 0.5, 1].map((frac) => (
                    <Button
                      key={frac}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAmount(String(Math.round(summary.remainingBalance * frac * 100) / 100))}
                    >
                      {frac === 1 ? "Full balance" : `${frac * 100}%`}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="payment-note">Note</Label>
                <Textarea
                  id="payment-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Bank transfer ref #12345"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createPayment.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || exceeds || nothingOwed || createPayment.isPending}>
            {createPayment.isPending ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Updates an employee's hourly rate; locked billing months keep their snapshot. */
export function UpdateRateDialog({
  employeeId,
  employeeName,
  currentRate,
  open,
  onOpenChange,
}: {
  employeeId: string;
  employeeName: string;
  currentRate: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [rate, setRate] = React.useState(String(currentRate));
  const updateRate = useUpdateHourlyRate();

  useResetOnOpen(open, () => setRate(String(currentRate)));

  const value = Number(rate);
  const valid = Number.isFinite(value) && value > 0;

  const handleSubmit = () =>
    updateRate.mutate(
      { employeeId, hourlyRate: value },
      {
        onSuccess: () => {
          toast.success("Hourly rate updated", { description: `${employeeName} now earns ${formatMoney(value)}/hour.` });
          onOpenChange(false);
        },
        onError: (error) => toast.error("Couldn't update rate", { description: getApiErrorMessage(error) }),
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update hourly rate</DialogTitle>
          <DialogDescription>{employeeName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hourly-rate">Hourly rate *</Label>
            <Input
              id="hourly-rate"
              type="number"
              min={0.01}
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
            {rate !== "" && !valid && <p className="text-destructive text-xs">The rate must be greater than 0.</p>}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Badge variant="muted">
              <Wallet />
              Current {formatMoney(currentRate)}/hr
            </Badge>
            {valid && value !== currentRate && (
              <Badge variant={value > currentRate ? "success" : "warning"}>
                New {formatMoney(value)}/hr
              </Badge>
            )}
          </div>

          <p className="text-muted-foreground text-xs">
            The new rate applies to billing months that haven&apos;t been locked by a payment yet. Months already paid keep
            the rate they were calculated with.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateRate.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || updateRate.isPending}>
            {updateRate.isPending && <Loader2 className="size-4 animate-spin" />}
            Save rate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
