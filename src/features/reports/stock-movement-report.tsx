"use client";

import * as React from "react";
import { ArrowLeftRight } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { MovementTypeBadge } from "@/components/shared/status-badges";
import { Pagination } from "@/components/shared/pagination";
import { DateRangePicker, currentMonthRange, type DateRange } from "@/components/shared/period-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStockMovementReport } from "@/hooks/queries/use-reports";
import { useProducts } from "@/hooks/queries/use-products";
import { reportsService } from "@/services/reports.service";
import { movementDirection, signedMovementQuantity } from "@/lib/calc";
import { cn, formatDateTime, formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
import { DownloadButton, ReportToolbar } from "./report-shell";
import type { StockMovementType } from "@/types";

const MOVEMENT_TYPES: StockMovementType[] = [
  "PURCHASE",
  "CONSUMPTION",
  "ADJUSTMENT",
  "WRITE_OFF",
  "RETURN",
  "ASSEMBLY",
  "TASK_RESERVATION",
  "TASK_RELEASE",
  "DAMAGE",
  "REFILL",
];

const PAGE_SIZE = 20;

export function StockMovementReportView() {
  const [range, setRange] = React.useState<DateRange>(currentMonthRange);
  const [type, setType] = React.useState<string>("all");
  const [productId, setProductId] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const { data: productsData } = useProducts({ showPerPage: 200 });

  const valid = range.from <= range.to;
  const params = {
    from: valid ? range.from : undefined,
    to: valid ? range.to : undefined,
    type: type === "all" ? undefined : type,
    productId: productId === "all" ? undefined : productId,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError, error, refetch } = useStockMovementReport(params);
  const movements = data?.movements ?? [];

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar
        filters={
          <>
            <DateRangePicker
              value={range}
              onChange={(r) => {
                setRange(r);
                setPage(1);
              }}
            />
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground text-xs">Movement type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground text-xs">Item</Label>
              <Select
                value={productId}
                onValueChange={(v) => {
                  setProductId(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All items</SelectItem>
                  {(productsData?.products ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        }
        actions={
          <>
            <DownloadButton label="PDF" kind="pdf" download={() => reportsService.downloadStockMovementsPdf(params)} />
            <DownloadButton label="CSV" kind="csv" download={() => reportsService.exportStockMovementsCsv(params)} />
          </>
        }
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading && !data ? (
        <TableSkeleton rows={10} />
      ) : (
        <ChartCard
          title="Stock movement audit trail"
          description={`${formatNumber(data?.meta.total ?? 0)} movements match these filters`}
        >
          {movements.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="No movements found" description="Try widening the date range." />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead className="min-w-44">Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead className="min-w-40">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => {
                      const qty = signedMovementQuantity(m);
                      const dir = movementDirection(m.type);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {formatDateTime(m.createdAt)}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{m.product?.name ?? "—"}</p>
                            <p className="text-muted-foreground text-xs">{m.product?.sku ?? "No SKU"}</p>
                          </TableCell>
                          <TableCell>
                            <MovementTypeBadge type={m.type} />
                          </TableCell>
                          <TableCell
                            className={cn(
                              "tabular text-right text-sm font-medium",
                              dir > 0 ? "text-success" : dir < 0 ? "text-destructive" : "text-muted-foreground",
                            )}
                          >
                            {dir > 0 ? "+" : ""}
                            {formatQuantity(dir === 0 ? Math.abs(qty) : qty, m.product?.unit)}
                          </TableCell>
                          <TableCell className="tabular text-right text-sm">{formatMoney(m.unitCost)}</TableCell>
                          <TableCell className="tabular text-right text-sm">{formatMoney(m.totalCost)}</TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">
                            {m.batch?.batchNumber ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{m.performedBy?.name ?? "System"}</TableCell>
                          <TableCell className="text-muted-foreground max-w-48 truncate text-sm">
                            {m.reason ?? m.notes ?? "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                page={data?.meta.page ?? page}
                pageCount={data?.meta.totalPages ?? 1}
                onPageChange={setPage}
                totalItems={data?.meta.total ?? 0}
                pageSize={PAGE_SIZE}
              />
            </div>
          )}
        </ChartCard>
      )}
    </div>
  );
}
