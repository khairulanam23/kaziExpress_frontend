"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Package, PackageCheck, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERMISSIONS } from "@/constants/permissions";
import { useSetSellingPrice } from "@/hooks/queries/use-sales";
import { usePermissions } from "@/hooks/use-permissions";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatMoney } from "@/lib/utils";
import type { FinishedGoodsItem, FinishedGoodsStatus } from "@/types";

/**
 * The pieces of a finished-goods row that carry behaviour rather than layout.
 *
 * Both the table and the card render these, so a price edited from a card and
 * a price edited from a row go through exactly the same permission check,
 * validation and mutation. Duplicating them per view is how the two would
 * quietly drift apart.
 */

export const STATUS_META: Record<
  FinishedGoodsStatus,
  { label: string; variant: "success" | "warning" | "muted"; icon: typeof Package }
> = {
  UNSOLD: { label: "Unsold", variant: "success", icon: Package },
  PARTLY_SOLD: { label: "Partly sold", variant: "warning", icon: PackageCheck },
  FULLY_DISPOSED: { label: "Fully disposed", variant: "muted", icon: Check },
};

/** Margin drawn as a bar so healthy and thin lines separate at a glance. */
export function MarginBar({ margin, className }: { margin: number | null; className?: string }) {
  if (margin === null) return <span className="text-muted-foreground text-xs">No price set</span>;
  const clamped = Math.max(0, Math.min(100, margin));
  const tone = margin < 0 ? "bg-destructive" : margin < 15 ? "bg-warning" : "bg-success";
  const word = margin < 0 ? "Loss" : margin < 15 ? "Thin" : "Healthy";
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <div className="bg-muted h-1.5 w-14 overflow-hidden rounded-full sm:w-20">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, clamped)}%` }} />
      </div>
      <span className="tabular text-xs">
        {margin.toFixed(1)}% <span className="text-muted-foreground">{word}</span>
      </span>
    </div>
  );
}

/** Inline editor for the default price offered on a product's finished goods. */
export function SellingPriceCell({ item }: { item: FinishedGoodsItem }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(item.product.sellingPrice != null ? String(item.product.sellingPrice) : "");
  const setPrice = useSetSellingPrice();
  const { has } = usePermissions();

  if (!has(PERMISSIONS.SALES_SET_PRICE)) {
    return (
      <span className="tabular text-sm">
        {item.product.sellingPrice != null ? formatMoney(item.product.sellingPrice) : "—"}
      </span>
    );
  }

  const save = async () => {
    const parsed = value.trim() === "" ? null : Number(value);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      toast.error("Enter a price of zero or more");
      return;
    }
    try {
      await setPrice.mutateAsync({ productId: item.product.id, sellingPrice: parsed });
      toast.success(`Price for ${item.product.name} updated`);
      setEditing(false);
    } catch (error) {
      toast.error("Couldn't save that price", { description: getApiErrorMessage(error) });
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="hover:bg-muted group flex items-center gap-1.5 rounded-md px-1.5 py-0.5"
        aria-label={`Set selling price for ${item.product.name}`}
      >
        <span className="tabular text-sm">
          {item.product.sellingPrice != null ? formatMoney(item.product.sellingPrice) : "Set price"}
        </span>
        <Pencil className="text-muted-foreground size-3 opacity-0 transition group-hover:opacity-100" aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        type="number"
        min={0}
        step="any"
        className="h-8 w-24"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button size="icon" variant="ghost" className="size-7" onClick={save} disabled={setPrice.isPending} aria-label="Save price">
        <Check className="size-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditing(false)} aria-label="Cancel">
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
