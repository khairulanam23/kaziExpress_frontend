"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import { AlertTriangle, Loader2, PackageCheck, Truck } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useReportDamage, useReportProduction, useRequestTaskRefill } from "@/hooks/queries/use-tasks";
import { getApiErrorMessage } from "@/lib/api-client";
import { num, percent, previewConsumption, taskProgress } from "@/lib/calc";
import { formatQuantity } from "@/lib/utils";
import type { Task } from "@/types";

// ───────────────────────────────────────────────────────────────────────────
// Report production (full or partial)
// ───────────────────────────────────────────────────────────────────────────
export function ReportProductionDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const progress = taskProgress(task);
  const [quantity, setQuantity] = React.useState(String(progress.remaining));
  const [notes, setNotes] = React.useState("");
  const reportProduction = useReportProduction();

  useResetOnOpen(open, () => {
      setQuantity(String(taskProgress(task).remaining));
      setNotes("");
  });

  const qty = Number(quantity);
  const qtyValid = Number.isFinite(qty) && qty > 0;
  const exceedsRemaining = qtyValid && qty > progress.remaining;
  const willComplete = qtyValid && !exceedsRemaining && qty >= progress.remaining;

  // Preview only — the server recomputes consumption when it commits the report.
  const consumption = React.useMemo(
    () => (qtyValid && !exceedsRemaining ? previewConsumption(task, qty) : []),
    [task, qty, qtyValid, exceedsRemaining],
  );

  const projectedCompleted = qtyValid ? progress.completed + Math.min(qty, progress.remaining) : progress.completed;

  const handleSubmit = () => {
    reportProduction.mutate(
      { id: task.id, payload: { completedQuantity: qty, notes: notes.trim() || undefined } },
      {
        onSuccess: (result) => {
          toast.success(willComplete ? "Task completed" : "Partial production recorded", {
            description: `Output batch ${result.outputBatch.batchNumber} created.`,
          });
          onOpenChange(false);
        },
        onError: (error) => toast.error("Couldn't record production", { description: getApiErrorMessage(error) }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report production</DialogTitle>
          <DialogDescription>
            Record how many units you finished. Materials are consumed and a new output batch is created.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="bg-muted/40 flex flex-col gap-2 rounded-xl p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress so far</span>
              <span className="tabular font-semibold">
                {formatQuantity(progress.completed)} / {formatQuantity(progress.planned)} {task.product?.unit ?? "units"}
              </span>
            </div>
            <Progress value={percent(projectedCompleted, progress.planned)} />
            <p className="text-muted-foreground text-xs">
              {formatQuantity(progress.remaining)} remaining before this task is complete.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="completed-qty">Completed quantity *</Label>
            <Input
              id="completed-qty"
              type="number"
              min={0.001}
              max={progress.remaining}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {!qtyValid && quantity !== "" && <p className="text-destructive text-xs">Enter a quantity greater than 0.</p>}
            {exceedsRemaining && (
              <p className="text-destructive text-xs">
                Only {formatQuantity(progress.remaining)} units remain on this task.
              </p>
            )}
            {willComplete && !exceedsRemaining && (
              <p className="text-success text-xs">This will complete the task.</p>
            )}
          </div>

          {consumption.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-medium">Materials that will be consumed</p>
              <div className="flex flex-col gap-1.5">
                {consumption.map((c) => (
                  <div key={c.batchId} className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <span className="font-medium">{c.productName}</span>
                      <span className="text-muted-foreground ml-1.5 font-mono">{c.batchNumber}</span>
                    </div>
                    <span className="tabular font-semibold">{formatQuantity(c.willConsume)}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Proportional to the quantity reported. Final amounts are calculated by the server.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prod-notes">Notes</Label>
            <Textarea
              id="prod-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth recording about this run…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reportProduction.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!qtyValid || exceedsRemaining || reportProduction.isPending}>
            {reportProduction.isPending ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
            Record production
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Report damaged / lost material
// ───────────────────────────────────────────────────────────────────────────
export function ReportDamageDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [productId, setProductId] = React.useState("");
  const [batchId, setBatchId] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState("");
  const [reason, setReason] = React.useState("");
  const reportDamage = useReportDamage();

  useResetOnOpen(open, () => {
      setProductId("");
      setBatchId("");
      setQuantity("");
      setReason("");
  });

  /** Only materials this task actually reserved can be reported damaged. */
  const materials = React.useMemo(
    () =>
      (task.requiredProducts ?? []).map((rp) => ({
        id: rp.productId,
        name: rp.product.name,
        unit: rp.product.unit,
      })),
    [task],
  );

  const batchOptions = React.useMemo(
    () => (task.batchAllocations ?? []).filter((a) => a.batch.product?.id === productId),
    [task, productId],
  );

  const qty = Number(quantity);
  const qtyValid = Number.isFinite(qty) && qty > 0;
  const canSubmit = !!productId && qtyValid && reason.trim().length > 0;

  const handleSubmit = () => {
    reportDamage.mutate(
      {
        id: task.id,
        payload: { productId, batchId: batchId || undefined, quantity: qty, reason: reason.trim() },
      },
      {
        onSuccess: () => {
          toast.success("Damage reported", { description: "Inventory has been adjusted." });
          onOpenChange(false);
        },
        onError: (error) => toast.error("Couldn't report damage", { description: getApiErrorMessage(error) }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report damaged material</DialogTitle>
          <DialogDescription>
            Record components that were damaged, lost or unusable. Stock is written down and an audit entry is created.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Component *</Label>
            <Select
              value={productId}
              onValueChange={(v) => {
                setProductId(v);
                setBatchId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select the damaged component" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {materials.length === 0 && (
              <p className="text-muted-foreground text-xs">This task has no recorded material requirements.</p>
            )}
          </div>

          {batchOptions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional — pick the affected batch" />
                </SelectTrigger>
                <SelectContent>
                  {batchOptions.map((a) => (
                    <SelectItem key={a.batchId} value={a.batchId}>
                      {a.batch.batchNumber} · {formatQuantity(a.batch.remainingQuantity)} left
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="damage-qty">Quantity damaged *</Label>
            <Input
              id="damage-qty"
              type="number"
              min={0.001}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {quantity !== "" && !qtyValid && <p className="text-destructive text-xs">Enter a quantity greater than 0.</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="damage-reason">What happened? *</Label>
            <Textarea
              id="damage-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Dropped during assembly — casing cracked"
            />
            {reason.trim().length === 0 && (
              <p className="text-muted-foreground text-xs">A reason is required for the audit trail.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reportDamage.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!canSubmit || reportDamage.isPending}>
            {reportDamage.isPending ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
            Report damage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Request a material refill
// ───────────────────────────────────────────────────────────────────────────
export function RequestRefillDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [productId, setProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [reason, setReason] = React.useState("");
  const requestRefill = useRequestTaskRefill();

  useResetOnOpen(open, () => {
      setProductId("");
      setQuantity("");
      setReason("");
  });

  /** Shortfall preview per component, from the task's own requirement snapshot. */
  const materials = React.useMemo(
    () =>
      (task.requiredProducts ?? []).map((rp) => {
        const allocated = (task.batchAllocations ?? [])
          .filter((a) => a.batch.product?.id === rp.productId)
          .reduce((sum, a) => sum + num(a.allocatedQuantity), 0);
        return {
          id: rp.productId,
          name: rp.product.name,
          unit: rp.product.unit ?? undefined,
          required: num(rp.quantity),
          allocated,
          shortfall: Math.max(0, num(rp.quantity) - allocated),
        };
      }),
    [task],
  );

  const selected = materials.find((m) => m.id === productId);
  const qty = Number(quantity);
  const qtyValid = Number.isFinite(qty) && qty > 0;

  const handleSubmit = () => {
    requestRefill.mutate(
      { id: task.id, payload: { productId, quantity: qty, reason: reason.trim() || undefined } },
      {
        onSuccess: () => {
          toast.success("Refill requested", { description: "An admin will review your request." });
          onOpenChange(false);
        },
        onError: (error) => toast.error("Couldn't request refill", { description: getApiErrorMessage(error) }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request material refill</DialogTitle>
          <DialogDescription>
            Ran short on a component? Ask an admin to allocate more stock to this task.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Component *</Label>
            <Select
              value={productId}
              onValueChange={(v) => {
                setProductId(v);
                const match = materials.find((m) => m.id === v);
                if (match?.shortfall) setQuantity(String(match.shortfall));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Which component do you need?" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                    {m.shortfall > 0 ? ` · short ${formatQuantity(m.shortfall)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <div className="bg-muted/40 flex flex-col gap-1 rounded-xl p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required for this task</span>
                <span className="tabular font-medium">{formatQuantity(selected.required, selected.unit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already allocated</span>
                <span className="tabular font-medium">{formatQuantity(selected.allocated, selected.unit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shortfall</span>
                <Badge variant={selected.shortfall > 0 ? "warning" : "success"}>
                  {formatQuantity(selected.shortfall, selected.unit)}
                </Badge>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refill-qty">Quantity needed *</Label>
            <Input
              id="refill-qty"
              type="number"
              min={0.001}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {quantity !== "" && !qtyValid && <p className="text-destructive text-xs">Enter a quantity greater than 0.</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refill-reason">Reason</Label>
            <Textarea
              id="refill-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need more?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={requestRefill.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!productId || !qtyValid || requestRefill.isPending}>
            {requestRefill.isPending ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
