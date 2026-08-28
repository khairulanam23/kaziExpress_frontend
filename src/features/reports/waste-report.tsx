"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { DateRangePicker, currentMonthRange, type DateRange } from "@/components/shared/period-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWasteReport } from "@/hooks/queries/use-analytics";
import { formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
import type { WasteGroupRow } from "@/types";
import { ReportToolbar, SummaryTile } from "./report-shell";

/**
 * Waste & scrap.
 *
 * Every DAMAGE and WRITE_OFF movement already carried its own cost, task and
 * operator — this reads that ledger back as money lost, grouped four ways so
 * the question "where is it going" has an answer rather than a total.
 */

/** A share bar makes the concentration of loss visible before the numbers are read. */
function ShareBar({ share }: { share: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full sm:w-24">
        <div
          className="bg-destructive h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(2, share))}%` }}
        />
      </div>
      <span className="tabular text-muted-foreground text-xs">{share}%</span>
    </div>
  );
}

function GroupTable({ rows, label, empty }: { rows: WasteGroupRow[]; label: string; empty: string }) {
  if (rows.length === 0) return <EmptyState icon={Trash2} title={empty} description="Nothing was lost this way in this period — good news." />;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{label}</TableHead>
            <TableHead className="text-right">Events</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead>Share of loss</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.productId ?? row.taskId ?? row.employeeId ?? row.reason ?? index}`}>
              <TableCell className="font-medium">
                {row.name ?? row.title ?? row.reason ?? "Unattributed"}
                {row.sku && <span className="text-muted-foreground ml-2 text-xs">{row.sku}</span>}
              </TableCell>
              <TableCell className="tabular text-right">{formatNumber(row.events)}</TableCell>
              <TableCell className="tabular text-right">
                {formatQuantity(row.quantity)} {row.unit ?? ""}
              </TableCell>
              <TableCell className="tabular text-destructive text-right font-semibold">{formatMoney(row.cost)}</TableCell>
              <TableCell>
                <ShareBar share={row.shareOfCost} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function WasteReportView() {
  const [range, setRange] = React.useState<DateRange>(currentMonthRange);
  const valid = range.from <= range.to;
  const { data, isLoading, isError, error, refetch } = useWasteReport({
    from: valid ? range.from : undefined,
    to: valid ? range.to : undefined,
  });

  const summary = data?.summary;

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar filters={<DateRangePicker value={range} onChange={setRange} />} />

      {isLoading && <TableSkeleton rows={6} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}

      {data && summary && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SummaryTile label="Total lost" value={formatMoney(summary.totalCost)} tone="destructive" helper={`${formatNumber(summary.events)} events`} />
            <SummaryTile label="Damaged" value={formatMoney(summary.damagedCost)} tone="warning" helper="Broken in production" />
            <SummaryTile label="Written off" value={formatMoney(summary.writtenOffCost)} tone="warning" helper="Removed from stock" />
            <SummaryTile label="Quantity lost" value={formatQuantity(summary.totalQuantity)} helper="Across all units" />
            <SummaryTile label="Products affected" value={formatNumber(data.byProduct.length)} helper="Distinct items" />
          </div>

          {summary.events === 0 ? (
            <EmptyState icon={Trash2} title="No waste recorded" description="No material was damaged or written off in this period." />
          ) : (
            <ChartCard title="Where the loss is coming from" description="The same money, grouped four ways.">
              <Tabs defaultValue="product">
                <TabsList>
                  <TabsTrigger value="product">By product</TabsTrigger>
                  <TabsTrigger value="task">By task</TabsTrigger>
                  <TabsTrigger value="employee">By employee</TabsTrigger>
                  <TabsTrigger value="reason">By reason</TabsTrigger>
                </TabsList>
                <TabsContent value="product" className="pt-3">
                  <GroupTable rows={data.byProduct} label="Product" empty="No product-level loss" />
                </TabsContent>
                <TabsContent value="task" className="pt-3">
                  <GroupTable rows={data.byTask} label="Production task" empty="No loss tied to a task" />
                </TabsContent>
                <TabsContent value="employee" className="pt-3">
                  <GroupTable rows={data.byEmployee} label="Recorded by" empty="No loss attributed to a person" />
                </TabsContent>
                <TabsContent value="reason" className="pt-3">
                  <GroupTable rows={data.byReason} label="Reason given" empty="No reasons recorded" />
                </TabsContent>
              </Tabs>
            </ChartCard>
          )}

          {data.recent.length > 0 && (
            <ChartCard title="Most recent events" description="The last 50 losses, newest first.">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Recorded by</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.product ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={row.type === "DAMAGE" ? "destructive" : "secondary"}>
                            {row.type === "DAMAGE" ? "Damaged" : "Written off"}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular text-right">{formatQuantity(row.quantity)}</TableCell>
                        <TableCell className="tabular text-right">{formatMoney(row.cost)}</TableCell>
                        <TableCell className="max-w-56 truncate text-sm">{row.reason ?? "—"}</TableCell>
                        <TableCell className="text-sm">{row.employee ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(row.at).toLocaleDateString()}
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
