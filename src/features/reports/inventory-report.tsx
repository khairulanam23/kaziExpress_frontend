"use client";

import * as React from "react";
import { Boxes } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { ItemTypeBadge, ProductStockBadge } from "@/components/shared/status-badges";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCategories } from "@/hooks/queries/use-categories";
import { useVendors } from "@/hooks/queries/use-vendors";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/constants/permissions";
import { useInventoryReport } from "@/hooks/queries/use-reports";
import { reportsService, type InventoryReportParams } from "@/services/reports.service";
import { lineValue, percent } from "@/lib/calc";
import { formatMoney, formatNumber, formatPercent, formatQuantity } from "@/lib/utils";
import { DownloadButton, ReportToolbar, SummaryTile } from "./report-shell";

export function InventoryReportView() {
  const [params, setParams] = React.useState<InventoryReportParams>({ status: "ACTIVE" });
  const { data, isLoading, isError, error, refetch } = useInventoryReport(params);
  // Filter dropdowns are a convenience; skip them when the lists aren't readable.
  const { has } = usePermissions();
  const { data: categories } = useCategories(undefined, { enabled: has(PERMISSIONS.CATEGORY_VIEW) });
  const { data: vendors } = useVendors(undefined, { enabled: has(PERMISSIONS.VENDOR_VIEW) });

  const summary = data?.summary;

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar
        filters={
          <>
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground text-xs">Item type</Label>
              <Select
                value={params.itemType ?? "all"}
                onValueChange={(v) =>
                  setParams((p) => ({ ...p, itemType: v === "all" ? undefined : (v as "COMPONENT" | "PRODUCT") }))
                }
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All items</SelectItem>
                  <SelectItem value="COMPONENT">Components</SelectItem>
                  <SelectItem value="PRODUCT">Products</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground text-xs">Status</Label>
              <Select
                value={params.status ?? "ACTIVE"}
                onValueChange={(v) => setParams((p) => ({ ...p, status: v as InventoryReportParams["status"] }))}
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                  <SelectItem value="ALL">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground text-xs">Category</Label>
              <Select
                value={params.categoryId ?? "all"}
                onValueChange={(v) => setParams((p) => ({ ...p, categoryId: v === "all" ? undefined : v }))}
              >
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {(categories?.categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground text-xs">Vendor</Label>
              <Select
                value={params.vendorId ?? "all"}
                onValueChange={(v) => setParams((p) => ({ ...p, vendorId: v === "all" ? undefined : v }))}
              >
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vendors</SelectItem>
                  {(vendors?.vendors ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        }
        actions={<DownloadButton label="PDF" kind="pdf" download={() => reportsService.downloadInventoryPdf(params)} />}
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading && !data ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <SummaryTile label="Total items" value={formatNumber(summary?.totalItems ?? 0)} tone="primary" />
            <SummaryTile label="Components" value={formatNumber(summary?.totalComponents ?? 0)} />
            <SummaryTile label="Products" value={formatNumber(summary?.totalProducts ?? 0)} />
            <SummaryTile label="Total quantity" value={formatQuantity(summary?.totalQuantity ?? 0)} />
            <SummaryTile
              label="Low stock"
              value={formatNumber(summary?.lowStockCount ?? 0)}
              tone={summary?.lowStockCount ? "warning" : "success"}
            />
            <SummaryTile
              label="Out of stock"
              value={formatNumber(summary?.outOfStockCount ?? 0)}
              tone={summary?.outOfStockCount ? "destructive" : "success"}
            />
          </div>

          <div className="bg-primary-soft/40 flex flex-wrap items-baseline justify-between gap-2 rounded-2xl p-4">
            <div>
              <p className="text-muted-foreground text-sm">Total inventory valuation</p>
              <p className="text-muted-foreground text-xs">Stock on hand × unit price, across every matching item</p>
            </div>
            <p className="tabular text-primary text-3xl font-bold">{formatMoney(summary?.totalValue ?? 0)}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Value by category" description="Where inventory value is concentrated">
              {!data?.byCategory.length ? (
                <EmptyState title="No categorised items" description="Assign categories to see this breakdown." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...data.byCategory]
                      .sort((a, b) => b.value - a.value)
                      .map((c) => (
                        <TableRow key={c.name}>
                          <TableCell className="text-sm font-medium">{c.name}</TableCell>
                          <TableCell className="tabular text-right text-sm">{formatNumber(c.count)}</TableCell>
                          <TableCell className="tabular text-right text-sm">{formatMoney(c.value)}</TableCell>
                          <TableCell className="tabular text-right text-sm">
                            {formatPercent(percent(c.value, summary?.totalValue ?? 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </ChartCard>

            <ChartCard title="Value by vendor" description="Supplier concentration">
              {!data?.byVendor.length ? (
                <EmptyState title="No vendor-linked items" description="Assign vendors to see this breakdown." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...data.byVendor]
                      .sort((a, b) => b.value - a.value)
                      .map((v) => (
                        <TableRow key={v.name}>
                          <TableCell className="text-sm font-medium">{v.name}</TableCell>
                          <TableCell className="tabular text-right text-sm">{formatNumber(v.count)}</TableCell>
                          <TableCell className="tabular text-right text-sm">{formatMoney(v.value)}</TableCell>
                          <TableCell className="tabular text-right text-sm">
                            {formatPercent(percent(v.value, summary?.totalValue ?? 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Items" description={`${formatNumber(data?.items.length ?? 0)} items in this report`}>
            {!data?.items.length ? (
              <EmptyState icon={Boxes} title="No items match these filters" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-48">Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-xs">{item.sku ?? "No SKU"}</p>
                        </TableCell>
                        <TableCell>
                          <ItemTypeBadge itemType={item.itemType} />
                        </TableCell>
                        <TableCell className="tabular text-right text-sm">
                          {formatQuantity(item.currentStock, item.unit)}
                        </TableCell>
                        <TableCell className="tabular text-right text-sm">{formatMoney(item.unitPrice)}</TableCell>
                        <TableCell className="tabular text-right text-sm font-medium">
                          {formatMoney(lineValue(item))}
                        </TableCell>
                        <TableCell>
                          <ProductStockBadge currentStock={item.currentStock} lowStockThreshold={item.lowStockThreshold} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}
