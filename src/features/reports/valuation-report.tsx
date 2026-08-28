"use client";

import * as React from "react";
import { Info, Scale } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useValuationReport } from "@/hooks/queries/use-analytics";
import { formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
import { ReportToolbar, SummaryTile } from "./report-shell";

/**
 * Inventory valuation.
 *
 * Stock valued at what it actually cost to acquire, batch by batch, alongside
 * what the list price claims it is worth. The gap between the two is the point
 * of the report, so both are always shown together.
 */
function VarianceCell({ actual, list }: { actual: number; list: number }) {
  const diff = actual - list;
  if (Math.abs(diff) < 0.005) return <span className="text-muted-foreground text-xs">Matches list</span>;
  const cheaper = diff < 0;
  return (
    <span className={`tabular text-xs font-medium ${cheaper ? "text-success" : "text-warning"}`}>
      {cheaper ? "Cost less" : "Cost more"} by {formatMoney(Math.abs(diff))}
    </span>
  );
}

export function ValuationReportView() {
  const { data, isLoading, isError, error, refetch } = useValuationReport();

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar
        filters={
          <p className="text-muted-foreground max-w-2xl text-sm">
            Every batch still holding stock, valued at the unit cost of the movement that created it.
          </p>
        }
      />

      {isLoading && <TableSkeleton rows={6} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryTile label="Value at cost" value={formatMoney(data.summary.totalValueAtCost)} tone="primary" helper="What it was bought for" />
            <SummaryTile label="Value at list price" value={formatMoney(data.summary.totalValueAtListPrice)} helper="What the catalogue says" />
            <SummaryTile
              label="Difference"
              value={formatMoney(Math.abs(data.summary.variance))}
              tone={data.summary.variance <= 0 ? "success" : "warning"}
              helper={data.summary.variance <= 0 ? "Held below list price" : "Held above list price"}
            />
            <SummaryTile
              label="Coverage"
              value={`${formatNumber(data.summary.batches)} batches`}
              helper={
                data.summary.batchesValuedAtListPrice > 0
                  ? `${formatNumber(data.summary.batchesValuedAtListPrice)} fell back to list price`
                  : "All costed from the ledger"
              }
            />
          </div>

          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{data.basis}</span>
          </p>

          {data.items.length === 0 ? (
            <EmptyState icon={Scale} title="No stock on hand" description="No batch is currently holding any quantity." />
          ) : (
            <ChartCard title="Value by product" description="Largest holdings first.">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Batches</TableHead>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead className="text-right">List price</TableHead>
                      <TableHead className="text-right">Value at cost</TableHead>
                      <TableHead>vs list</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {item.sku ?? "No SKU"}
                            {item.reserved > 0 && ` · ${formatQuantity(item.reserved)} reserved`}
                          </div>
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {formatQuantity(item.quantity)} {item.unit ?? ""}
                        </TableCell>
                        <TableCell className="tabular text-right">{formatNumber(item.batches)}</TableCell>
                        <TableCell className="tabular text-right">{formatMoney(item.weightedUnitCost)}</TableCell>
                        <TableCell className="tabular text-muted-foreground text-right">{formatMoney(item.listUnitPrice)}</TableCell>
                        <TableCell className="tabular text-right font-semibold">{formatMoney(item.actualValue)}</TableCell>
                        <TableCell>
                          <VarianceCell actual={item.actualValue} list={item.listValue} />
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
