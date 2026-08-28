"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { ProductMedia, UserAvatar } from "@/components/shared/initials-avatar";
import { PERMISSIONS } from "@/constants/permissions";
import { formatDate, formatMoney, formatQuantity } from "@/lib/utils";
import { MarginBar, SellingPriceCell, STATUS_META } from "./finished-goods-cells";
import type { FinishedGoodsItem } from "@/types";

/**
 * A manufactured batch presented as a catalogue card.
 *
 * Everything the table column set carried is still here — product, batch
 * number, build date, who made it, remaining against initial quantity, unit
 * cost with its provisional warning, the editable selling price, margin,
 * status, revenue earned and the Sell action. The behavioural parts come from
 * `finished-goods-cells`, shared with the table, so neither view can drift.
 *
 * Cost and price sit together on one line because the margin below them is the
 * difference between the two; splitting them apart is what makes a card of
 * financial figures harder to read than a row.
 */
export function FinishedGoodCard({
  item,
  onSell,
}: {
  item: FinishedGoodsItem;
  onSell: (item: FinishedGoodsItem) => void;
}) {
  const meta = STATUS_META[item.status];
  const soldOut = item.remainingQuantity <= 0;

  return (
    <Card className="group focus-within:ring-ring/50 flex h-full flex-col gap-0 overflow-hidden p-0 transition-shadow duration-200 hover:shadow-[0_14px_32px_-18px_rgba(15,23,42,0.35)] focus-within:ring-2">
      <div className="relative">
        <ProductMedia
          name={item.product.name}
          imageUrl={item.product.imageUrl}
          aspect="aspect-[16/9] sm:aspect-[4/3]"
        />
        <div className="absolute top-2.5 left-2.5">
          <Badge variant={meta.variant}>
            <meta.icon />
            {meta.label}
          </Badge>
        </div>
      </div>

      {/* Identity */}
      <div className="flex flex-col gap-0.5 px-4 pt-3">
        <p className="line-clamp-2 text-sm leading-snug font-semibold" title={item.product.name}>
          {item.product.name}
        </p>
        <p className="text-muted-foreground font-mono text-xs">{item.batchNumber}</p>
        <p className="text-muted-foreground text-xs">Built {formatDate(item.producedAt)}</p>
      </div>

      {/* Who made it — faces read faster than a list of names. */}
      <div className="mt-2.5 flex items-center gap-2 px-4">
        {item.producedBy.length === 0 ? (
          <span className="text-muted-foreground text-xs">Unassigned</span>
        ) : (
          <>
            <div className="flex -space-x-2">
              {item.producedBy.slice(0, 3).map((p) => (
                <UserAvatar key={p.id} name={p.name} imageUrl={p.avatarUrl} size="size-6" ring />
              ))}
            </div>
            <span className="text-muted-foreground truncate text-xs" title={item.producedBy.map((p) => p.name).join(", ")}>
              {item.producedBy.length === 1
                ? item.producedBy[0].name
                : `${item.producedBy.length} people`}
            </span>
          </>
        )}
      </div>

      {/* Available */}
      <div className="mt-3 px-4">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Available</p>
        <p className="tabular text-sm">
          <span className="font-medium">{formatQuantity(item.remainingQuantity)}</span>
          <span className="text-muted-foreground"> / {formatQuantity(item.initialQuantity)}</span>
          {item.product.unit && <span className="text-muted-foreground"> {item.product.unit}</span>}
        </p>
      </div>

      {/* Cost against price, with margin directly underneath. */}
      <div className="border-border/60 mt-3 grid grid-cols-2 gap-x-3 border-t px-4 pt-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Cost / unit</p>
          <p className="tabular text-sm font-medium">{formatMoney(item.unitCost)}</p>
          {!item.costIsFinal && (
            <p
              className="text-warning text-xs"
              title="The production run has not finished, so labour is not included yet"
            >
              provisional
            </p>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Selling price</p>
          <div className="-ml-1.5">
            <SellingPriceCell item={item} />
          </div>
        </div>
      </div>

      <div className="mt-2 px-4">
        <MarginBar margin={item.suggestedMargin} />
      </div>

      {item.dispositionCount > 0 && (
        <p className="text-muted-foreground mt-2 px-4 text-xs">{formatMoney(item.revenueToDate)} earned</p>
      )}

      <div className="border-border/60 mt-auto border-t px-4 py-3 pt-3">
        <PermissionGate permission={PERMISSIONS.SALES_RECORD}>
          <Button
            size="sm"
            className="w-full"
            variant={soldOut ? "outline" : "default"}
            disabled={soldOut}
            onClick={() => onSell(item)}
          >
            {soldOut ? "Sold out" : "Sell"}
          </Button>
        </PermissionGate>
      </div>
    </Card>
  );
}

/** Matches the card's structure so nothing shifts when the data lands. */
export function FinishedGoodCardSkeleton() {
  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden p-0">
      <Skeleton className="aspect-[16/9] w-full rounded-none sm:aspect-[4/3]" />
      <div className="flex flex-col gap-2 px-4 pt-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="mt-3 px-4">
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="border-border/60 mt-3 grid grid-cols-2 gap-3 border-t px-4 pt-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="border-border/60 mt-3 border-t px-4 py-3">
        <Skeleton className="h-8 w-full" />
      </div>
    </Card>
  );
}
