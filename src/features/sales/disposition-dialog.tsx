"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Factory, Loader2, Store, Trash2, TrendingDown, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDisposition, useCustomers } from "@/hooks/queries/use-sales";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api-client";
import { formatMoney, formatQuantity } from "@/lib/utils";
import type { DispositionType, FinishedGoodsItem } from "@/types";

/**
 * Records what happens to a batch of finished goods.
 *
 * The margin preview is the reason this screen exists: the admin types a price
 * and sees what it earns against what the batch actually cost, before
 * committing. Selling below cost is allowed — clearance and damaged stock are
 * real — but it is called out rather than passed over silently.
 */

const DESTINATIONS: Array<{
  value: DispositionType;
  label: string;
  blurb: string;
  icon: typeof User;
}> = [
  { value: "CUSTOMER_SALE", label: "Customer", blurb: "Sold to an outside buyer", icon: User },
  { value: "STORE_TRANSFER", label: "Our store", blurb: "Sold on to your own outlet", icon: Store },
  { value: "WRITE_OFF", label: "Write off", blurb: "Scrapped — no revenue, the cost is lost", icon: Trash2 },
];

export function DispositionDialog({
  item,
  open,
  onOpenChange,
}: {
  item: FinishedGoodsItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [type, setType] = React.useState<DispositionType>("CUSTOMER_SALE");
  const [customerId, setCustomerId] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState("1");
  const [price, setPrice] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const isWriteOff = type === "WRITE_OFF";
  const { data: customerData } = useCustomers(
    { type: type === "STORE_TRANSFER" ? "OWN_STORE" : undefined },
    { enabled: open && !isWriteOff },
  );
  const createDisposition = useCreateDisposition();

  // Reset during render when a different batch is opened, rather than in an
  // effect — the form must never flash the previous batch's numbers.
  const [lastKey, setLastKey] = React.useState<string | null>(null);
  const key = open && item ? item.batchId : null;
  if (key !== lastKey) {
    setLastKey(key);
    setType("CUSTOMER_SALE");
    setCustomerId("");
    setQuantity(item ? String(Math.min(1, item.remainingQuantity)) : "1");
    setPrice(item?.product.sellingPrice != null ? String(item.product.sellingPrice) : "");
    setReason("");
    setNotes("");
    setFieldErrors({});
  }

  if (!item) return null;

  const qty = Number(quantity) || 0;
  const unitPrice = Number(price) || 0;
  const unitCost = item.unitCost;
  const revenue = isWriteOff ? 0 : unitPrice * qty;
  const cogs = unitCost * qty;
  const profit = revenue - cogs;
  const margin = revenue > 0 ? (profit / revenue) * 100 : null;
  const belowCost = !isWriteOff && unitPrice > 0 && unitPrice < unitCost;
  const overQuantity = qty > item.remainingQuantity;

  const customers = customerData?.customers ?? [];

  const submit = async () => {
    setFieldErrors({});
    try {
      await createDisposition.mutateAsync({
        batchId: item.batchId,
        payload: {
          type,
          quantity: qty,
          customerId: isWriteOff ? null : customerId || null,
          unitSellingPrice: isWriteOff ? undefined : unitPrice,
          reason: reason.trim() || null,
          notes: notes.trim() || null,
        },
      });
      toast.success(
        isWriteOff
          ? `Wrote off ${formatQuantity(qty)} ${item.product.unit ?? "units"}`
          : `Recorded ${formatMoney(revenue)} of revenue`,
        { description: isWriteOff ? `Cost of ${formatMoney(cogs)} written off` : `Gross profit ${formatMoney(profit)}` },
      );
      onOpenChange(false);
    } catch (error) {
      // getApiFieldErrors already returns a field -> message map.
      setFieldErrors(getApiFieldErrors(error));
      toast.error("Couldn't record this", { description: getApiErrorMessage(error) });
    }
  };

  const canSubmit =
    qty > 0 &&
    !overQuantity &&
    (isWriteOff ? reason.trim().length > 0 : !!customerId && unitPrice >= 0) &&
    !createDisposition.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record a sale or disposal</DialogTitle>
          <DialogDescription>
            {item.product.name} · <span className="font-mono">{item.batchNumber}</span> ·{" "}
            {formatQuantity(item.remainingQuantity)} {item.product.unit ?? "units"} available
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Destination — icon and words, never colour alone. */}
          <div className="flex flex-col gap-2">
            <Label>Destination</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DESTINATIONS.map((d) => {
                const active = type === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setType(d.value)}
                    aria-pressed={active}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                      active ? "border-primary bg-primary-soft/40 ring-primary/30 ring-2" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <d.icon className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
                    <span className="text-sm font-medium">{d.label}</span>
                    <span className="text-muted-foreground text-xs">{d.blurb}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!isWriteOff && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="disposition-customer">
                {type === "STORE_TRANSFER" ? "Which outlet" : "Buyer"}
              </Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger id="disposition-customer">
                  <SelectValue placeholder={customers.length ? "Choose a buyer" : "No customers yet — add one first"} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      <span className="text-muted-foreground ml-2 text-xs">
                        {c.type === "OWN_STORE" ? "Own store" : c.type === "WHOLESALE" ? "Wholesale" : "Retail"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.customerId && <p className="text-destructive text-xs">{fieldErrors.customerId}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="disposition-qty">Quantity</Label>
              <Input
                id="disposition-qty"
                type="number"
                min={0}
                max={item.remainingQuantity}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-invalid={overQuantity}
              />
              {overQuantity && (
                <p className="text-destructive text-xs">
                  Only {formatQuantity(item.remainingQuantity)} available in this batch
                </p>
              )}
            </div>

            {!isWriteOff && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="disposition-price">Price per {item.product.unit ?? "unit"}</Label>
                <Input
                  id="disposition-price"
                  type="number"
                  min={0}
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={item.product.sellingPrice != null ? String(item.product.sellingPrice) : "0"}
                />
                {fieldErrors.unitSellingPrice && <p className="text-destructive text-xs">{fieldErrors.unitSellingPrice}</p>}
              </div>
            )}
          </div>

          {/* The margin preview — the point of the screen. */}
          <div className="bg-muted/40 flex flex-col gap-2 rounded-xl p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cost of these {formatQuantity(qty)}</span>
              <span className="tabular font-medium">{formatMoney(cogs)}</span>
            </div>
            {!isWriteOff && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Revenue</span>
                <span className="tabular font-medium">{formatMoney(revenue)}</span>
              </div>
            )}
            <div className="border-border flex items-center justify-between border-t pt-2">
              <span className="text-sm font-medium">{isWriteOff ? "Loss" : "Gross profit"}</span>
              <span
                className={`tabular flex items-center gap-1.5 text-base font-bold ${
                  isWriteOff || profit < 0 ? "text-destructive" : "text-success"
                }`}
              >
                {isWriteOff || profit < 0 ? (
                  <TrendingDown className="size-4" aria-hidden />
                ) : (
                  <TrendingUp className="size-4" aria-hidden />
                )}
                {isWriteOff ? `−${formatMoney(cogs)}` : formatMoney(profit)}
                {margin !== null && !isWriteOff && (
                  <span className="text-muted-foreground text-sm font-normal">({margin.toFixed(1)}%)</span>
                )}
              </span>
            </div>

            {belowCost && (
              <p className="text-warning flex items-start gap-1.5 text-xs">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                This price is below the {formatMoney(unitCost)} it cost to make. That is allowed — clearance and damaged
                stock happen — but this sale will lose money.
              </p>
            )}

            {!item.costIsFinal && (
              <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                <Factory className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                This batch&apos;s production run has not finished, so its cost covers material but not labour yet. The real
                margin will be lower than shown.
              </p>
            )}
          </div>

          {isWriteOff && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="disposition-reason">Why is this being written off?</Label>
              <Input
                id="disposition-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Damaged in handling, failed inspection…"
                aria-invalid={!!fieldErrors.reason}
              />
              {fieldErrors.reason && <p className="text-destructive text-xs">{fieldErrors.reason}</p>}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disposition-notes">Notes (optional)</Label>
            <Textarea
              id="disposition-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Invoice reference, delivery details…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createDisposition.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {createDisposition.isPending && <Loader2 className="size-3.5 animate-spin" />}
            {isWriteOff ? "Write off" : `Record ${formatMoney(revenue)} sale`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
