"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Search } from "lucide-react";
import { SectionHeader } from "@/components/shared/chart-card";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/constants/permissions";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { MovementTypeBadge } from "@/components/shared/status-badges";
import { Pagination } from "@/components/shared/pagination";
import { DateRangePicker, currentMonthRange, type DateRange } from "@/components/shared/period-picker";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddStockDialog, AdjustStockDialog } from "@/features/inventory/stock-dialogs";
import { useInventoryMovements } from "@/hooks/queries/use-inventory";
import { useProducts } from "@/hooks/queries/use-products";
import { movementDirection, num, round, signedMovementQuantity } from "@/lib/calc";
import { cn, formatDateTime, formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
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

export default function StockMovementsPage() {
  const [range, setRange] = React.useState<DateRange>(currentMonthRange);
  const [type, setType] = React.useState<StockMovementType | "all">("all");
  const [productId, setProductId] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const { data: productsData } = useProducts({ showPerPage: 200 });

  const valid = range.from <= range.to;
  const { data, isLoading, isError, error, refetch } = useInventoryMovements({
    from: valid ? range.from : undefined,
    to: valid ? range.to : undefined,
    type: type === "all" ? undefined : type,
    productId: productId === "all" ? undefined : productId,
    pageNo: page,
    showPerPage: PAGE_SIZE,
  });

  const term = search.trim().toLowerCase();
  const movements = (data?.movements ?? []).filter(
    (m) =>
      !term ||
      (m.product?.name ?? "").toLowerCase().includes(term) ||
      (m.batch?.batchNumber ?? "").toLowerCase().includes(term) ||
      (m.reason ?? m.notes ?? "").toLowerCase().includes(term),
  );

  // Totals describe the rows on screen — the reports module owns period-wide figures.
  const totals = React.useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    let value = 0;
    for (const m of data?.movements ?? []) {
      const q = signedMovementQuantity(m);
      if (movementDirection(m.type) > 0) inbound += Math.abs(q);
      else if (movementDirection(m.type) < 0) outbound += Math.abs(q);
      value += num(m.totalCost);
    }
    return { inbound: round(inbound, 3), outbound: round(outbound, 3), value: round(value) };
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Stock movements"
        description="Every change to inventory — purchases, production, adjustments, damage and reservations."
        action={
          <div className="flex gap-2">
            <PermissionGate permission={PERMISSIONS.INVENTORY_MANAGE_STOCK}>
              <AdjustStockDialog />
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.INVENTORY_CREATE}>
              <AddStockDialog />
            </PermissionGate>
          </div>
        }
      />

      {isLoading && !data ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Movements" value={formatNumber(data?.totalData ?? 0)} icon={ArrowLeftRight} accent="primary" helper="Matching current filters" />
          <StatCard label="Stock in" value={formatQuantity(totals.inbound)} icon={ArrowUpRight} accent="success" helper="On this page" />
          <StatCard label="Stock out" value={formatQuantity(totals.outbound)} icon={ArrowDownLeft} accent="warning" helper="On this page" />
          <StatCard label="Value moved" value={formatMoney(totals.value)} icon={ArrowLeftRight} accent="accent" helper="On this page" />
        </div>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-end">
          <DateRangePicker
            value={range}
            onChange={(r) => {
              setRange(r);
              setPage(1);
            }}
          />

          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground text-xs">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as StockMovementType | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
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
              <SelectTrigger className="w-48">
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

          <div className="relative flex-1">
            <Label className="text-muted-foreground mb-1 text-xs">Search</Label>
            <Search className="text-muted-foreground pointer-events-none absolute bottom-2.5 left-3 size-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Item, batch or reason…"
              className="pl-9"
            />
          </div>
        </div>

        {isError ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={() => refetch()} />
          </div>
        ) : isLoading && !data ? (
          <TableSkeleton rows={10} />
        ) : movements.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ArrowLeftRight}
              title="No movements found"
              description="Try widening the date range or clearing a filter."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead className="min-w-44">Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Stock after</TableHead>
                    <TableHead className="text-right">Value</TableHead>
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
                        <TableCell className="tabular text-muted-foreground text-right text-sm">
                          {m.newQuantity !== null && m.newQuantity !== undefined ? formatQuantity(m.newQuantity) : "—"}
                        </TableCell>
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

            <div className="pb-4">
              <Pagination
                page={page}
                pageCount={data?.totalPages ?? 1}
                onPageChange={setPage}
                totalItems={data?.totalData ?? 0}
                pageSize={PAGE_SIZE}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
