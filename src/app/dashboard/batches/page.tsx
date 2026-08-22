"use client";

import * as React from "react";
import { Layers, Lock, Search } from "lucide-react";
import { SectionHeader } from "@/components/shared/chart-card";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/constants/permissions";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddStockDialog, AdjustStockDialog } from "@/features/inventory/stock-dialogs";
import { useBatches } from "@/hooks/queries/use-inventory";
import { useProducts } from "@/hooks/queries/use-products";
import { batchAvailable, num, percent, totalAvailable, totalReserved } from "@/lib/calc";
import { formatDate, formatNumber, formatPercent, formatQuantity } from "@/lib/utils";

const PAGE_SIZE = 15;

export default function BatchesPage() {
  const [search, setSearch] = React.useState("");
  const [productId, setProductId] = React.useState("all");
  const [availability, setAvailability] = React.useState<"all" | "available" | "reserved" | "depleted">("all");
  const [page, setPage] = React.useState(1);

  const { data: batches = [], isLoading, isError, error, refetch } = useBatches(
    productId === "all" ? undefined : productId,
  );
  const { data: productsData } = useProducts({ showPerPage: 200 });

  const term = search.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      batches.filter((b) => {
        if (term && !b.batchNumber.toLowerCase().includes(term) && !(b.product?.name ?? "").toLowerCase().includes(term)) {
          return false;
        }
        const available = batchAvailable(b);
        const remaining = num(b.remainingQuantity);
        if (availability === "available") return available > 0;
        if (availability === "reserved") return num(b.reservedQuantity) > 0;
        if (availability === "depleted") return remaining <= 0;
        return true;
      }),
    [batches, term, availability],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const paged = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const stats = React.useMemo(
    () => ({
      total: batches.length,
      available: totalAvailable(batches),
      reserved: totalReserved(batches),
      active: batches.filter((b) => num(b.remainingQuantity) > 0).length,
    }),
    [batches],
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Inventory batches"
        description="Every batch of stock, what's reserved for production, and what's still free to allocate."
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

      {isLoading && !batches.length ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total batches" value={formatNumber(stats.total)} icon={Layers} accent="primary" helper={`${formatNumber(stats.active)} still holding stock`} />
          <StatCard label="Available quantity" value={formatQuantity(stats.available)} icon={Layers} accent="success" helper="Free to allocate to tasks" />
          <StatCard label="Reserved quantity" value={formatQuantity(stats.reserved)} icon={Lock} accent="warning" helper="Held for accepted tasks" />
          <StatCard
            label="Reserved share"
            value={formatPercent(percent(stats.reserved, stats.reserved + stats.available))}
            icon={Layers}
            accent="accent"
            helper="Of all committed stock"
          />
        </div>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <Label className="text-muted-foreground mb-1 text-xs">Search</Label>
            <Search className="text-muted-foreground pointer-events-none absolute bottom-2.5 left-3 size-4" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Batch number or item name…"
              className="pl-9"
            />
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
              <SelectTrigger className="w-52">
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

          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground text-xs">Availability</Label>
            <Select
              value={availability}
              onValueChange={(v) => {
                setAvailability(v as typeof availability);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                <SelectItem value="available">Has available stock</SelectItem>
                <SelectItem value="reserved">Has reservations</SelectItem>
                <SelectItem value="depleted">Depleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isError ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={() => refetch()} />
          </div>
        ) : isLoading ? (
          <TableSkeleton rows={8} />
        ) : paged.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Layers}
              title={batches.length ? "No batches match these filters" : "No batches yet"}
              description={batches.length ? "Try clearing a filter." : "Adding stock to an item creates its first batch."}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead className="min-w-44">Item</TableHead>
                    <TableHead className="text-right">Initial</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="min-w-28">Consumed</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((b) => {
                    const initial = num(b.initialQuantity);
                    const remaining = num(b.remainingQuantity);
                    const reserved = num(b.reservedQuantity);
                    const available = batchAvailable(b);
                    const consumed = percent(initial - remaining, initial);

                    return (
                      <TableRow key={b.id}>
                        <TableCell>
                          <p className="font-mono text-sm">{b.batchNumber}</p>
                          {b.sourceTaskId && (
                            <Badge variant="secondary" className="mt-0.5">
                              From production
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{b.product?.name ?? "—"}</p>
                          <p className="text-muted-foreground text-xs">{b.product?.sku ?? "No SKU"}</p>
                        </TableCell>
                        <TableCell className="tabular text-muted-foreground text-right text-sm">
                          {formatQuantity(initial)}
                        </TableCell>
                        <TableCell className="tabular text-right text-sm font-medium">{formatQuantity(remaining)}</TableCell>
                        <TableCell className="text-right">
                          {reserved > 0 ? (
                            <Badge variant="warning">
                              <Lock />
                              {formatQuantity(reserved)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={available > 0 ? "success" : "muted"}>{formatQuantity(available)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={consumed} className="h-1.5 w-14" />
                            <span className="tabular text-xs">{formatPercent(consumed)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <p>{formatDate(b.createdAt)}</p>
                          <p className="text-xs">{b.createdBy?.name ?? "—"}</p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="pb-4">
              <Pagination
                page={clampedPage}
                pageCount={pageCount}
                onPageChange={setPage}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
