"use client";

import * as React from "react";
import { toast } from "sonner";
import { Boxes, Check, Factory, Package, PackageCheck, Pencil, Search, Store, Tag, X } from "lucide-react";
import { SectionHeader } from "@/components/shared/chart-card";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERMISSIONS } from "@/constants/permissions";
import { DispositionDialog } from "@/features/sales/disposition-dialog";
import { useFinishedGoods, useSetSellingPrice } from "@/hooks/queries/use-sales";
import { usePermissions } from "@/hooks/use-permissions";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDate, formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
import type { FinishedGoodsItem, FinishedGoodsStatus } from "@/types";

/**
 * Finished goods — what the floor has actually built.
 *
 * Every row is a production output batch, so it carries the run that made it,
 * the people who made it, and what it genuinely cost. That is what turns a
 * selling price into a margin rather than a guess.
 */

const STATUS_META: Record<
  FinishedGoodsStatus,
  { label: string; variant: "success" | "warning" | "muted"; icon: typeof Package }
> = {
  UNSOLD: { label: "Unsold", variant: "success", icon: Package },
  PARTLY_SOLD: { label: "Partly sold", variant: "warning", icon: PackageCheck },
  FULLY_DISPOSED: { label: "Fully disposed", variant: "muted", icon: Check },
};

/** Margin drawn as a bar so healthy and thin lines separate at a glance. */
function MarginBar({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-muted-foreground text-xs">No price set</span>;
  const clamped = Math.max(0, Math.min(100, margin));
  const tone = margin < 0 ? "bg-destructive" : margin < 15 ? "bg-warning" : "bg-success";
  const word = margin < 0 ? "Loss" : margin < 15 ? "Thin" : "Healthy";
  return (
    <div className="flex items-center gap-2">
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
function SellingPriceCell({ item }: { item: FinishedGoodsItem }) {
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

export default function FinishedGoodsPage() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"ALL" | FinishedGoodsStatus>("ALL");
  const [selling, setSelling] = React.useState<FinishedGoodsItem | null>(null);

  const { data, isLoading, isError, error, refetch } = useFinishedGoods({
    search: search.trim() || undefined,
    status,
  });

  const items = data?.items ?? [];
  const summary = data?.summary;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Finished goods"
        description="Products your team has manufactured — what each batch cost, what it can sell for, and where it went."
      />

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Ready to sell"
            value={formatQuantity(summary.unitsOnHand)}
            icon={Boxes}
            helper={`${formatNumber(summary.unsold)} unsold, ${formatNumber(summary.partlySold)} partly sold`}
          />
          <StatCard
            label="Stock value at cost"
            value={formatMoney(summary.stockValue)}
            icon={Tag}
            helper={
              summary.provisionalCost > 0
                ? `${formatNumber(summary.provisionalCost)} batch(es) still costing`
                : "All costs final"
            }
          />
          <StatCard label="Revenue to date" value={formatMoney(summary.revenueToDate)} icon={Store} />
          <StatCard
            label="Gross profit"
            value={formatMoney(summary.profitToDate)}
            icon={PackageCheck}
            helper="From these batches"
          />
        </div>
      )}

      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="fg-search" className="text-muted-foreground text-xs">
              Search
            </Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" aria-hidden />
              <Input
                id="fg-search"
                className="h-9 w-56 pl-8"
                placeholder="Product or batch number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "ALL" | FinishedGoodsStatus)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All batches</SelectItem>
                <SelectItem value="UNSOLD">Unsold</SelectItem>
                <SelectItem value="PARTLY_SOLD">Partly sold</SelectItem>
                <SelectItem value="FULLY_DISPOSED">Fully disposed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && <TableSkeleton rows={6} />}
        {isError && <ErrorState error={error} onRetry={refetch} />}

        {data && items.length === 0 && (
          <EmptyState
            icon={Factory}
            title="Nothing manufactured yet"
            description="Finished goods appear here once a production task reports output. Complete a run on the shopfloor and its batch will show up."
          />
        )}

        {data && items.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product &amp; batch</TableHead>
                  <TableHead>Made by</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Cost / unit</TableHead>
                  <TableHead>Selling price</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const meta = STATUS_META[item.status];
                  return (
                    <TableRow key={item.batchId}>
                      <TableCell>
                        <p className="text-sm font-medium">{item.product.name}</p>
                        <p className="text-muted-foreground font-mono text-xs">{item.batchNumber}</p>
                        <p className="text-muted-foreground text-xs">Built {formatDate(item.producedAt)}</p>
                      </TableCell>
                      <TableCell>
                        {item.producedBy.length === 0 ? (
                          <span className="text-muted-foreground text-xs">Unassigned</span>
                        ) : (
                          <div className="flex flex-col">
                            {item.producedBy.map((p) => (
                              <span key={p.id} className="text-sm">
                                {p.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="tabular text-right text-sm">
                        <span className="font-medium">{formatQuantity(item.remainingQuantity)}</span>
                        <span className="text-muted-foreground"> / {formatQuantity(item.initialQuantity)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="tabular text-sm font-medium">{formatMoney(item.unitCost)}</span>
                        {!item.costIsFinal && (
                          <p
                            className="text-warning text-xs"
                            title="The production run has not finished, so labour is not included yet"
                          >
                            provisional
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <SellingPriceCell item={item} />
                      </TableCell>
                      <TableCell>
                        <MarginBar margin={item.suggestedMargin} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>
                          <meta.icon />
                          {meta.label}
                        </Badge>
                        {item.dispositionCount > 0 && (
                          <p className="text-muted-foreground mt-0.5 text-xs">{formatMoney(item.revenueToDate)} earned</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <PermissionGate permission={PERMISSIONS.SALES_RECORD}>
                          <Button
                            size="sm"
                            variant={item.remainingQuantity > 0 ? "default" : "outline"}
                            disabled={item.remainingQuantity <= 0}
                            onClick={() => setSelling(item)}
                          >
                            {item.remainingQuantity > 0 ? "Sell" : "Sold out"}
                          </Button>
                        </PermissionGate>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <DispositionDialog item={selling} open={!!selling} onOpenChange={(open) => !open && setSelling(null)} />
    </div>
  );
}
