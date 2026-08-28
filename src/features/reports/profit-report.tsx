"use client";

import * as React from "react";
import { Coins, Info, Store, TrendingDown, TrendingUp, User } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { DateRangePicker, lastQuarterRange, type DateRange } from "@/components/shared/period-picker";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfitReport } from "@/hooks/queries/use-sales";
import { formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
import type { ProfitRow } from "@/types";
import { ReportToolbar, SummaryTile } from "./report-shell";

/**
 * Gross profit.
 *
 * Every figure comes from the values frozen when each sale was recorded, not
 * from today's prices and costs — so re-pricing a product cannot rewrite what
 * last month earned.
 */

/** Revenue split into cost and profit, so the shape of a margin is visible. */
function MarginBar({ revenue, cogs, profit }: { revenue: number; cogs: number; profit: number }) {
  if (revenue <= 0) return <span className="text-muted-foreground text-xs">No revenue</span>;
  const costPct = Math.max(0, Math.min(100, (cogs / revenue) * 100));
  const loss = profit < 0;
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted flex h-2 w-20 overflow-hidden rounded-full sm:w-28">
        <div className="bg-chart-3 h-full" style={{ width: `${costPct}%` }} title="Cost of goods sold" />
        <div className={`h-full ${loss ? "bg-destructive" : "bg-success"}`} style={{ width: `${Math.max(0, 100 - costPct)}%` }} title="Gross profit" />
      </div>
      <span className={`tabular text-xs ${loss ? "text-destructive" : ""}`}>
        {((profit / revenue) * 100).toFixed(1)}%
      </span>
    </div>
  );
}

function ProfitTable({ rows, label, showWriteOffs }: { rows: ProfitRow[]; label: string; showWriteOffs?: boolean }) {
  if (rows.length === 0) {
    return <EmptyState icon={Coins} title="Nothing sold yet" description="Record a sale from the Finished goods page and it will appear here." />;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{label}</TableHead>
            <TableHead className="text-right">Units</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Gross profit</TableHead>
            <TableHead>Margin</TableHead>
            {showWriteOffs && <TableHead className="text-right">Written off</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.productId ?? row.customerId ?? row.name}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  {row.type === "OWN_STORE" && (
                    <Badge variant="outline" className="gap-1">
                      <Store className="size-3" />
                      Own store
                    </Badge>
                  )}
                </div>
                {row.sku && <p className="text-muted-foreground text-xs">{row.sku}</p>}
              </TableCell>
              <TableCell className="tabular text-right">{formatQuantity(row.unitsSold)}</TableCell>
              <TableCell className="tabular text-right">{formatMoney(row.revenue)}</TableCell>
              <TableCell className="tabular text-muted-foreground text-right">{formatMoney(row.cogs)}</TableCell>
              <TableCell className={`tabular text-right font-semibold ${row.grossProfit < 0 ? "text-destructive" : ""}`}>
                {formatMoney(row.grossProfit)}
              </TableCell>
              <TableCell>
                <MarginBar revenue={row.revenue} cogs={row.cogs} profit={row.grossProfit} />
              </TableCell>
              {showWriteOffs && (
                <TableCell className="tabular text-right">
                  {row.writeOffCost > 0 ? (
                    <span className="text-destructive">{formatMoney(row.writeOffCost)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ProfitReportView() {
  const [range, setRange] = React.useState<DateRange>(lastQuarterRange);
  const [includeStoreTransfers, setIncludeStoreTransfers] = React.useState(true);
  const valid = range.from <= range.to;

  const { data, isLoading, isError, error, refetch } = useProfitReport({
    from: valid ? range.from : undefined,
    to: valid ? range.to : undefined,
    includeStoreTransfers,
  });

  const summary = data?.summary;

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar
        filters={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <div className="flex items-center gap-2 pb-2">
              <Switch id="include-transfers" checked={includeStoreTransfers} onCheckedChange={setIncludeStoreTransfers} />
              <Label htmlFor="include-transfers" className="text-sm">
                Count sales to our own store
              </Label>
            </div>
          </>
        }
      />

      {isLoading && <TableSkeleton rows={6} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}

      {data && summary && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SummaryTile label="Revenue" value={formatMoney(summary.revenue)} tone="primary" helper={`${formatNumber(summary.sales)} sales`} />
            <SummaryTile label="Cost of goods sold" value={formatMoney(summary.cogs)} helper="What it cost to make" />
            <SummaryTile
              label="Gross profit"
              value={formatMoney(summary.grossProfit)}
              tone={summary.grossProfit >= 0 ? "success" : "destructive"}
              helper={summary.marginPercent === null ? undefined : `${summary.marginPercent.toFixed(1)}% margin`}
            />
            <SummaryTile
              label="Written off"
              value={formatMoney(summary.writeOffCost)}
              tone={summary.writeOffCost > 0 ? "destructive" : "default"}
              helper={`${formatNumber(summary.writeOffs)} disposal(s)`}
            />
            <SummaryTile
              label="After write-offs"
              value={formatMoney(summary.netOfWriteOffs)}
              tone={summary.netOfWriteOffs >= 0 ? "success" : "destructive"}
              helper="Profit less scrapped goods"
            />
          </div>

          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{data.basis}</span>
          </p>

          {summary.sales === 0 && summary.writeOffs === 0 ? (
            <EmptyState
              icon={Coins}
              title="No sales in this period"
              description="Profit is calculated from recorded sales of finished goods. Sell a batch from the Finished goods page, or widen the date range."
            />
          ) : (
            <>
              {data.byMonth.length > 1 && (
                <ChartCard title="Month by month" description="Revenue against cost, so a trend is visible rather than a single total.">
                  <div className="flex flex-col gap-2">
                    {data.byMonth.map((m) => (
                      <div key={m.month} className="flex items-center gap-3">
                        <span className="text-muted-foreground w-20 shrink-0 text-xs">{m.month}</span>
                        <MarginBar revenue={m.revenue} cogs={m.cogs} profit={m.grossProfit} />
                        <span className="tabular ml-auto text-sm">
                          {formatMoney(m.revenue)} <span className="text-muted-foreground">rev</span>
                        </span>
                        <span className={`tabular w-28 text-right text-sm font-semibold ${m.grossProfit < 0 ? "text-destructive" : "text-success"}`}>
                          {formatMoney(m.grossProfit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              )}

              <ChartCard title="Where the profit comes from" description="Most profitable first.">
                <Tabs defaultValue="product">
                  <TabsList>
                    <TabsTrigger value="product">By product</TabsTrigger>
                    <TabsTrigger value="customer">By customer</TabsTrigger>
                  </TabsList>
                  <TabsContent value="product" className="pt-3">
                    <ProfitTable rows={data.byProduct} label="Product" showWriteOffs />
                  </TabsContent>
                  <TabsContent value="customer" className="pt-3">
                    <ProfitTable rows={data.byCustomer} label="Customer" />
                  </TabsContent>
                </Tabs>
              </ChartCard>

              <ChartCard title="Recent activity" description="The last 50 sales and disposals.">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Went to</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead>When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recent.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <p className="font-mono text-xs">{row.dispositionNumber}</p>
                            <p className="text-muted-foreground font-mono text-xs">{row.batchNumber}</p>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{row.product}</TableCell>
                          <TableCell>
                            {row.type === "WRITE_OFF" ? (
                              <Badge variant="destructive">Written off</Badge>
                            ) : (
                              <div className="flex items-center gap-1.5 text-sm">
                                {row.type === "STORE_TRANSFER" ? (
                                  <Store className="text-muted-foreground size-3.5" aria-hidden />
                                ) : (
                                  <User className="text-muted-foreground size-3.5" aria-hidden />
                                )}
                                {row.customer ?? "Unattributed"}
                              </div>
                            )}
                            {row.reason && <p className="text-muted-foreground text-xs">{row.reason}</p>}
                          </TableCell>
                          <TableCell className="tabular text-right">{formatQuantity(row.quantity)}</TableCell>
                          <TableCell className="tabular text-right">{formatMoney(row.revenue)}</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`tabular inline-flex items-center gap-1 font-semibold ${
                                row.grossProfit < 0 ? "text-destructive" : "text-success"
                              }`}
                            >
                              {row.grossProfit < 0 ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
                              {formatMoney(row.grossProfit)}
                            </span>
                            {!row.costWasFinal && (
                              <p className="text-warning text-xs" title="The production run had not finished, so labour was not in the cost">
                                provisional cost
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(row.at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ChartCard>
            </>
          )}
        </>
      )}
    </div>
  );
}
