"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, PackageX, TrendingDown } from "lucide-react";
import { num, stockLevel, type StockLevel } from "@/lib/calc";
import { cn, formatQuantity } from "@/lib/utils";
import type { Decimalish } from "@/types";

/**
 * Visual treatment per stock state.
 *
 * Each level carries an icon and a written label alongside the colour, so the
 * state survives colour-blindness, greyscale printing and forced-colours mode.
 */
const LEVEL_META: Record<StockLevel, { label: string; bar: string; text: string; icon: typeof CheckCircle2 }> = {
  ok: { label: "Healthy stock", bar: "bg-success", text: "text-success", icon: CheckCircle2 },
  low: { label: "Low stock", bar: "bg-warning", text: "text-warning", icon: TrendingDown },
  out: { label: "Out of stock", bar: "bg-destructive", text: "text-destructive", icon: PackageX },
  negative: { label: "Negative stock", bar: "bg-destructive", text: "text-destructive", icon: AlertTriangle },
};

/**
 * Fill fraction for the bar.
 *
 * With a threshold set, the bar reads "how far above the reorder point" — the
 * threshold sits at ~35% so a healthy item still looks comfortably full and a
 * low one visibly isn't. Without a threshold there is no meaningful scale, so
 * the bar shows only presence/absence rather than inventing a maximum.
 */
function fillPercent(stock: number, threshold: number | null): number {
  if (stock <= 0) return 0;
  if (threshold === null || threshold <= 0) return 100;
  if (stock <= threshold) return Math.max(8, (stock / threshold) * 35);
  const headroom = Math.min(1, (stock - threshold) / (threshold * 2));
  return 35 + headroom * 65;
}

export function StockIndicator({
  currentStock,
  lowStockThreshold,
  unit,
  size = "md",
  showLabel = true,
  className,
}: {
  currentStock: Decimalish;
  lowStockThreshold?: Decimalish | null;
  unit?: string | null;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const stock = num(currentStock);
  const threshold =
    lowStockThreshold === null || lowStockThreshold === undefined ? null : num(lowStockThreshold);

  const level = stockLevel({ currentStock, lowStockThreshold: lowStockThreshold ?? null });
  const meta = LEVEL_META[level];
  const Icon = meta.icon;
  const fill = fillPercent(stock, threshold);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("tabular font-semibold", size === "sm" ? "text-sm" : "text-lg")}>
          {formatQuantity(stock, unit)}
        </span>
        {threshold !== null && (
          <span className="text-muted-foreground tabular text-xs">min {formatQuantity(threshold)}</span>
        )}
      </div>

      <div
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
        role="meter"
        aria-valuenow={stock}
        aria-valuemin={0}
        aria-valuetext={`${formatQuantity(stock, unit)} — ${meta.label}`}
        aria-label="Stock level"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", meta.bar)}
          style={{ width: `${fill}%` }}
        />
      </div>

      {showLabel && (
        <span className={cn("flex items-center gap-1 text-xs font-medium", meta.text)}>
          <Icon className="size-3" aria-hidden="true" />
          {meta.label}
        </span>
      )}
    </div>
  );
}

export { LEVEL_META };
