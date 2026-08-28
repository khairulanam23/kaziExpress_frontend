"use client";

import * as React from "react";
import { Info, TrendingDown, TrendingUp, Truck } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { DateRangePicker, lastQuarterRange, type DateRange } from "@/components/shared/period-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVendorPerformanceReport } from "@/hooks/queries/use-analytics";
import { formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
import { ReportToolbar, SummaryTile } from "./report-shell";

/**
 * Vendor performance.
 *
 * `StockMovement.vendorId` was added so a purchase could be attributed to who
 * supplied it. Deliveries recorded before that field existed cannot be, and are
 * reported as excluded rather than folded silently into the totals.
 */

/** Price drift stated with direction in words, not by colour alone. */
function Drift({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-muted-foreground text-xs">One delivery only</span>;
  if (Math.abs(percent) < 0.05) return <span className="text-muted-foreground text-xs">Held steady</span>;
  const up = percent > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? "text-destructive" : "text-success"}`}>
      <Icon className="size-3" aria-hidden />
      {up ? "Up" : "Down"} {Math.abs(percent).toFixed(1)}%
    </span>
  );
}

export function VendorPerformanceReportView() {
  // Completed runs and deliveries are sparse; a month-wide default opens empty.
  const [range, setRange] = React.useState<DateRange>(lastQuarterRange);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const valid = range.from <= range.to;
  const { data, isLoading, isError, error, refetch } = useVendorPerformanceReport({
    from: valid ? range.from : undefined,
    to: valid ? range.to : undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar filters={<DateRangePicker value={range} onChange={setRange} />} />

      {isLoading && <TableSkeleton rows={6} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryTile label="Total spend" value={formatMoney(data.summary.totalSpend)} tone="primary" />
            <SummaryTile label="Vendors" value={formatNumber(data.summary.vendors)} helper="With attributed deliveries" />
            <SummaryTile label="Deliveries" value={formatNumber(data.summary.deliveries)} />
            <SummaryTile
              label="Unattributed"
              value={formatNumber(data.summary.unattributedDeliveries)}
              tone={data.summary.unattributedDeliveries > 0 ? "warning" : "default"}
              helper="Predate vendor tracking"
            />
          </div>

          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{data.basis}</span>
          </p>

          {data.vendors.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No attributed purchases in this period"
              description="Vendor attribution starts from the first purchase recorded after the vendor field was added. Add stock with a vendor selected to populate this."
            />
          ) : (
            <ChartCard title="Spend by vendor" description="Select a vendor to see its per-product price history.">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Deliveries</TableHead>
                      <TableHead className="text-right">Products</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead>Price movement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.vendors.map((vendor) => (
                      <React.Fragment key={vendor.vendorId}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => setExpanded((id) => (id === vendor.vendorId ? null : vendor.vendorId))}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2 font-medium">
                              {vendor.name}
                              {!vendor.isActive && <Badge variant="outline">Inactive</Badge>}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {expanded === vendor.vendorId ? "Hide" : "Show"} price history
                            </div>
                          </TableCell>
                          <TableCell className="tabular text-right">{formatNumber(vendor.deliveries)}</TableCell>
                          <TableCell className="tabular text-right">{formatNumber(vendor.productsSupplied)}</TableCell>
                          <TableCell className="tabular text-right font-semibold">{formatMoney(vendor.spend)}</TableCell>
                          <TableCell>
                            {vendor.productsWithRisingPrice > 0 ? (
                              <span className="text-destructive inline-flex items-center gap-1 text-xs font-medium">
                                <TrendingUp className="size-3" aria-hidden />
                                {vendor.productsWithRisingPrice} rising
                                {vendor.largestPriceRisePercent !== null &&
                                  ` · up to +${vendor.largestPriceRisePercent.toFixed(1)}%`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">No increases</span>
                            )}
                          </TableCell>
                        </TableRow>

                        {expanded === vendor.vendorId &&
                          vendor.products.map((line) => (
                            <TableRow key={`${vendor.vendorId}-${line.productId}`} className="bg-muted/30">
                              <TableCell className="pl-8">
                                <div className="text-sm font-medium">{line.name}</div>
                                <div className="text-muted-foreground text-xs">
                                  {line.deliveries} deliveries · {formatQuantity(line.quantity)} {line.unit ?? ""}
                                </div>
                              </TableCell>
                              <TableCell className="tabular text-right text-sm">
                                {formatMoney(line.firstUnitCost)}
                                <div className="text-muted-foreground text-xs">first</div>
                              </TableCell>
                              <TableCell className="tabular text-right text-sm">
                                {formatMoney(line.lastUnitCost)}
                                <div className="text-muted-foreground text-xs">latest</div>
                              </TableCell>
                              <TableCell className="tabular text-right text-sm">{formatMoney(line.spend)}</TableCell>
                              <TableCell>
                                <Drift percent={line.priceDriftPercent} />
                              </TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
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
