"use client";

import * as React from "react";
import { Coins, Info } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { DateRangePicker, lastQuarterRange, type DateRange } from "@/components/shared/period-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProductionCostReport } from "@/hooks/queries/use-analytics";
import { formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
import { ReportToolbar, SummaryTile } from "./report-shell";

/**
 * Production cost per unit.
 *
 * Material comes from the movement ledger — what was actually consumed — not
 * from the BOM estimate, so the variance between the two is itself visible.
 * Labour is attributed rather than measured, which the server states in
 * `basis`; that caveat is shown next to the figures rather than hidden.
 */

/** Material / labour split, drawn so the dominant cost is obvious at a glance. */
function CostSplit({ material, labour }: { material: number; labour: number }) {
  const total = material + labour;
  if (total <= 0) return <span className="text-muted-foreground text-xs">No cost recorded</span>;
  const materialPct = (material / total) * 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="bg-muted flex h-2 w-28 overflow-hidden rounded-full sm:w-36">
        <div className="bg-chart-1 h-full" style={{ width: `${materialPct}%` }} />
        <div className="bg-chart-3 h-full" style={{ width: `${100 - materialPct}%` }} />
      </div>
      <span className="text-muted-foreground text-xs">
        {Math.round(materialPct)}% material · {Math.round(100 - materialPct)}% labour
      </span>
    </div>
  );
}

/** A variance is only meaningful with its direction stated in words. */
function Variance({ value }: { value: number }) {
  if (Math.abs(value) < 0.005) return <span className="text-muted-foreground text-xs">On plan</span>;
  const over = value > 0;
  return (
    <span className={`tabular text-xs font-medium ${over ? "text-destructive" : "text-success"}`}>
      {over ? "Over" : "Under"} by {formatMoney(Math.abs(value))}
    </span>
  );
}

export function ProductionCostReportView() {
  // Completed runs and deliveries are sparse; a month-wide default opens empty.
  const [range, setRange] = React.useState<DateRange>(lastQuarterRange);
  const valid = range.from <= range.to;
  const { data, isLoading, isError, error, refetch } = useProductionCostReport({
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SummaryTile label="Cost per unit" value={data.summary.averageCostPerUnit === null ? "—" : formatMoney(data.summary.averageCostPerUnit)} tone="primary" helper="Weighted average" />
            <SummaryTile label="Units produced" value={formatQuantity(data.summary.unitsProduced)} helper={`${formatNumber(data.summary.runs)} runs`} />
            <SummaryTile label="Material" value={formatMoney(data.summary.materialCost)} helper="Actually consumed" />
            <SummaryTile label="Labour" value={formatMoney(data.summary.labourCost)} helper="Attributed" />
            <SummaryTile label="Lost to waste" value={formatMoney(data.summary.wasteCost)} tone="destructive" helper="Inside these runs" />
          </div>

          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{data.basis}</span>
          </p>

          {data.summary.runs === 0 ? (
            <EmptyState
              icon={Coins}
              title="No completed runs in this period"
              description="Production cost is calculated from tasks that finished, so widen the date range or complete a run first."
            />
          ) : (
            <>
              <ChartCard title="Cost by product" description="Weighted by units produced, not by number of runs.">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Runs</TableHead>
                        <TableHead className="text-right">Units</TableHead>
                        <TableHead>Cost split</TableHead>
                        <TableHead className="text-right">Total cost</TableHead>
                        <TableHead className="text-right">Per unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byProduct.map((row) => (
                        <TableRow key={row.productId}>
                          <TableCell>
                            <div className="font-medium">{row.name}</div>
                            <div className="text-muted-foreground text-xs">{row.sku ?? "No SKU"}</div>
                          </TableCell>
                          <TableCell className="tabular text-right">{formatNumber(row.runs)}</TableCell>
                          <TableCell className="tabular text-right">
                            {formatQuantity(row.unitsProduced)} {row.unit ?? ""}
                          </TableCell>
                          <TableCell>
                            <CostSplit material={row.materialCost} labour={row.labourCost} />
                          </TableCell>
                          <TableCell className="tabular text-right">{formatMoney(row.totalCost)}</TableCell>
                          <TableCell className="tabular text-right font-semibold">
                            {row.averageCostPerUnit === null ? "—" : formatMoney(row.averageCostPerUnit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ChartCard>

              <ChartCard title="Individual runs" description="Actual material against what the bill of materials predicted.">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run</TableHead>
                        <TableHead className="text-right">Produced</TableHead>
                        <TableHead className="text-right">Material</TableHead>
                        <TableHead>vs planned</TableHead>
                        <TableHead className="text-right">Labour</TableHead>
                        <TableHead className="text-right">Per unit</TableHead>
                        <TableHead>Delivery</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.runs.map((run) => (
                        <TableRow key={run.taskId}>
                          <TableCell>
                            <div className="max-w-64 truncate font-medium">{run.title}</div>
                            <div className="text-muted-foreground text-xs">{run.product?.name ?? "No product"}</div>
                          </TableCell>
                          <TableCell className="tabular text-right">
                            {formatQuantity(run.producedQuantity)}
                            <span className="text-muted-foreground"> / {formatQuantity(run.targetQuantity)}</span>
                          </TableCell>
                          <TableCell className="tabular text-right">{formatMoney(run.materialCost)}</TableCell>
                          <TableCell>
                            <Variance value={run.materialVariance} />
                          </TableCell>
                          <TableCell className="tabular text-right">
                            {formatMoney(run.labourCost)}
                            <div className="text-muted-foreground text-xs">{formatNumber(run.labourHours)}h</div>
                          </TableCell>
                          <TableCell className="tabular text-right font-semibold">
                            {run.costPerUnit === null ? "—" : formatMoney(run.costPerUnit)}
                          </TableCell>
                          <TableCell>
                            {run.onTime === null ? (
                              <span className="text-muted-foreground text-xs">No deadline</span>
                            ) : (
                              <Badge variant={run.onTime ? "secondary" : "destructive"}>
                                {run.onTime ? "On time" : "Late"}
                              </Badge>
                            )}
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
