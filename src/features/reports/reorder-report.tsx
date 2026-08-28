"use client";

import * as React from "react";
import { AlertTriangle, Factory, PackageCheck, ShoppingCart } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReorderReport } from "@/hooks/queries/use-analytics";
import { formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
import type { ReorderItem, ReorderUrgency } from "@/types";
import { ReportToolbar, SummaryTile } from "./report-shell";

/**
 * Reorder planning.
 *
 * `reorderTimeDays`, `quantityInReorder` and `lowStockThreshold` were recorded
 * from the start and never used for anything. Read against actual consumption
 * they answer the question a low-stock badge cannot: is it already too late to
 * order?
 */

/** Urgency is never colour alone — each level carries an icon and a word. */
const URGENCY: Record<ReorderUrgency, { label: string; className: string; icon: typeof AlertTriangle }> = {
  CRITICAL: { label: "Critical", className: "bg-destructive-soft text-destructive border-destructive/30", icon: AlertTriangle },
  ORDER_NOW: { label: "Order now", className: "bg-warning-soft text-warning border-warning/30", icon: ShoppingCart },
  MONITOR: { label: "Monitor", className: "bg-primary-soft text-primary border-primary/30", icon: PackageCheck },
  OK: { label: "Sufficient", className: "bg-muted text-muted-foreground border-border", icon: PackageCheck },
};

function UrgencyBadge({ urgency }: { urgency: ReorderUrgency }) {
  const { label, className, icon: Icon } = URGENCY[urgency];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}

/**
 * Days of cover against lead time, drawn to scale. When the bar is shorter than
 * the marker, the replacement cannot arrive before the shelf empties.
 */
function CoverBar({ item }: { item: ReorderItem }) {
  if (item.daysOfCoverRemaining === null) {
    return <span className="text-muted-foreground text-xs">No consumption</span>;
  }
  const lead = item.leadTimeDays ?? 0;
  const scale = Math.max(item.daysOfCoverRemaining, lead, 1) * 1.15;
  const coverPct = (item.daysOfCoverRemaining / scale) * 100;
  const leadPct = (lead / scale) * 100;
  const short = lead > 0 && item.daysOfCoverRemaining < lead;

  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted relative h-2 w-24 overflow-hidden rounded-full sm:w-32">
        <div
          className={`h-full rounded-full ${short ? "bg-destructive" : "bg-success"}`}
          style={{ width: `${Math.max(2, coverPct)}%` }}
        />
        {lead > 0 && (
          <span
            className="bg-foreground absolute top-0 h-full w-0.5"
            style={{ left: `${Math.min(99, leadPct)}%` }}
            aria-hidden
          />
        )}
      </div>
      <span className="tabular text-xs">
        {formatNumber(item.daysOfCoverRemaining)}d
        {lead > 0 && <span className="text-muted-foreground"> / {lead}d lead</span>}
      </span>
    </div>
  );
}

export function ReorderReportView() {
  const [lookbackDays, setLookbackDays] = React.useState(90);
  const [horizonDays, setHorizonDays] = React.useState(30);
  const [actionableOnly, setActionableOnly] = React.useState(true);

  const { data, isLoading, isError, error, refetch } = useReorderReport({ lookbackDays, horizonDays });

  const rows = React.useMemo(
    () => (data?.items ?? []).filter((item) => (actionableOnly ? item.urgency !== "OK" : true)),
    [data, actionableOnly],
  );

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar
        filters={
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor="lookback" className="text-muted-foreground text-xs">
                Consumption window
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="lookback"
                  type="number"
                  min={7}
                  max={365}
                  className="h-9 w-24"
                  value={lookbackDays}
                  onChange={(e) => setLookbackDays(Math.max(7, Math.min(365, Number(e.target.value) || 90)))}
                />
                <span className="text-muted-foreground text-sm">days back</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="horizon" className="text-muted-foreground text-xs">
                Planning horizon
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="horizon"
                  type="number"
                  min={7}
                  max={180}
                  className="h-9 w-24"
                  value={horizonDays}
                  onChange={(e) => setHorizonDays(Math.max(7, Math.min(180, Number(e.target.value) || 30)))}
                />
                <span className="text-muted-foreground text-sm">days ahead</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch id="actionable" checked={actionableOnly} onCheckedChange={setActionableOnly} />
              <Label htmlFor="actionable" className="text-sm">
                Needs attention only
              </Label>
            </div>
          </>
        }
      />

      {isLoading && <TableSkeleton rows={6} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SummaryTile label="Critical" value={formatNumber(data.summary.critical)} tone="destructive" helper="Out of stock" />
            <SummaryTile label="Order now" value={formatNumber(data.summary.orderNow)} tone="warning" helper="Lead time exceeded" />
            <SummaryTile label="Monitor" value={formatNumber(data.summary.monitor)} tone="primary" helper={`Runs out in ${horizonDays}d`} />
            <SummaryTile label="To purchase" value={formatNumber(data.summary.toPurchase)} helper={`${formatNumber(data.summary.toProduce)} to produce`} />
            <SummaryTile label="Estimated spend" value={formatMoney(data.summary.estimatedOrderCost)} helper="Purchases only" />
          </div>

          <p className="text-muted-foreground text-xs">{data.basis}</p>

          {rows.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title={actionableOnly ? "Nothing needs ordering" : "No products to review"}
              description={
                actionableOnly
                  ? "Every product has enough cover for its lead time and the planning horizon."
                  : "No active products were found."
              }
            />
          ) : (
            <ChartCard
              title="Replenishment plan"
              description="Ordered by urgency, then by how soon each item runs out."
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">In stock</TableHead>
                      <TableHead className="text-right">Daily use</TableHead>
                      <TableHead>Cover vs lead time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Suggested</TableHead>
                      <TableHead className="text-right">Est. cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {item.sku ?? "No SKU"}
                            {item.vendor && ` · ${item.vendor.name}`}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-xs">{item.reason}</div>
                        </TableCell>
                        <TableCell>
                          <UrgencyBadge urgency={item.urgency} />
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {formatQuantity(item.currentStock)} {item.unit ?? ""}
                        </TableCell>
                        <TableCell className="tabular text-right">{formatQuantity(item.averageDailyConsumption)}</TableCell>
                        <TableCell>
                          <CoverBar item={item} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.action === "PRODUCE" ? "secondary" : "outline"} className="gap-1">
                            {item.action === "PRODUCE" ? <Factory className="size-3" /> : <ShoppingCart className="size-3" />}
                            {item.action === "PRODUCE" ? "Produce" : "Purchase"}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular text-right font-semibold">
                          {item.suggestedOrderQuantity > 0 ? formatQuantity(item.suggestedOrderQuantity) : "—"}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {item.action === "PURCHASE" && item.estimatedOrderCost > 0 ? formatMoney(item.estimatedOrderCost) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
