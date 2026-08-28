"use client";

import * as React from "react";
import { toast } from "sonner";
import { PackageSearch, SearchX } from "lucide-react";

import { SectionHeader } from "@/components/shared/chart-card";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/constants/permissions";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog, EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";

import { useProducts, useDeleteProduct, useLowStockProducts } from "@/hooks/queries/use-products";
import { InventoryToolbar } from "@/features/inventory/inventory-toolbar";
import { InventoryTable } from "@/features/inventory/inventory-table";
import { InventoryGrid, InventoryGridSkeleton } from "@/features/inventory/inventory-grid";
import { LowStockBanner } from "@/features/inventory/low-stock-banner";
import { ProductFormDialog } from "@/features/inventory/product-form-dialog";
import { ProductDetailsDrawer } from "@/features/inventory/product-details-drawer";
import { AddStockDialog, AdjustStockDialog } from "@/features/inventory/stock-dialogs";
import { getApiErrorMessage } from "@/lib/api-client";
import type { Product } from "@/types";

const PAGE_SIZE = 12;

/**
 * Components catalogue.
 *
 * Browsing defaults to the card grid, with the table kept as an alternate view
 * for anyone who wants the density. Both render the same fetched page — the
 * switch is presentation only and never triggers another request.
 */
export default function ComponentsPage() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [lowStockOnly, setLowStockOnly] = React.useState(false);
  const [view, setView] = React.useState<"list" | "grid">("grid");

  const [page, setPage] = React.useState(1);

  const [viewingProduct, setViewingProduct] = React.useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = React.useState<Product | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  const hasFilters = search.trim().length > 0 || category !== "all" || lowStockOnly;

  // Fetch Normal Products (Simple)
  const { data, isLoading, isError, error, refetch } = useProducts({
    search: search || undefined,
    category: category === "all" ? undefined : category,
    lowStock: lowStockOnly || undefined,
    isComposite: false,
    pageNo: page,
    showPerPage: PAGE_SIZE,
  });

  const { data: lowStockList } = useLowStockProducts();
  const deleteProduct = useDeleteProduct();

  const products = data?.products ?? [];

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setEditOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingProduct) return;
    deleteProduct.mutate(deletingProduct.id, {
      onSuccess: () => {
        toast.success("Component discontinued", { description: `${deletingProduct.name} is no longer active inventory.` });
        setDeletingProduct(null);
      },
      onError: (error) => toast.error("Couldn't discontinue component", { description: getApiErrorMessage(error) }),
    });
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setLowStockOnly(false);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Components catalog"
        description="Track, add, and update raw materials, components, and standalone items in your inventory."
        action={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permission={PERMISSIONS.INVENTORY_MANAGE_STOCK}>
              <AdjustStockDialog />
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.INVENTORY_CREATE}>
              <AddStockDialog />
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.PRODUCT_CREATE}>
              <ProductFormDialog defaultIsComposite={false} />
            </PermissionGate>
          </div>
        }
      />

      <LowStockBanner count={lowStockList?.filter((p) => !p.isComposite).length ?? 0} />

      <Card className="flex flex-col gap-4 py-6">
        <div className="px-4 pb-1 sm:px-6">
          <InventoryToolbar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            category={category}
            onCategoryChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
            lowStockOnly={lowStockOnly}
            onLowStockOnlyChange={(v) => {
              setLowStockOnly(v);
              setPage(1);
            }}
            view={view}
            onViewChange={setView}
            resultCount={data?.totalData}
          />
        </div>

        {isLoading ? (
          // Skeletons mirror whichever view will render, so nothing jumps.
          <div className={view === "grid" ? "px-4 sm:px-6" : ""}>
            {view === "grid" ? <InventoryGridSkeleton count={PAGE_SIZE} /> : <TableSkeleton rows={8} />}
          </div>
        ) : isError ? (
          <div className="px-4 sm:px-6">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : products.length === 0 ? (
          <div className="px-4 sm:px-6">
            {/*
              A catalogue with nothing in it and a search that found nothing are
              different problems, and only one of them is solved by adding a
              product.
            */}
            {hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="No components match your search"
                description="Try a different term, or clear the filters to see the whole catalogue."
                action={
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-primary text-sm font-medium underline underline-offset-4"
                  >
                    Clear search and filters
                  </button>
                }
              />
            ) : (
              <EmptyState
                icon={PackageSearch}
                title="No components yet"
                description="Raw materials, components and standalone items you add will appear here as a browsable catalogue."
                action={
                  <PermissionGate permission={PERMISSIONS.PRODUCT_CREATE}>
                    <ProductFormDialog defaultIsComposite={false} />
                  </PermissionGate>
                }
              />
            )}
          </div>
        ) : (
          <div className={view === "grid" ? "px-4 sm:px-6" : ""}>
            {view === "grid" ? (
              <InventoryGrid
                products={products}
                onView={setViewingProduct}
                onEdit={handleEdit}
                onDelete={setDeletingProduct}
              />
            ) : (
              <div className="overflow-x-auto">
                <InventoryTable
                  products={products}
                  onView={setViewingProduct}
                  onEdit={handleEdit}
                  onDelete={setDeletingProduct}
                />
              </div>
            )}
          </div>
        )}

        {!isError && products.length > 0 && (
          <Pagination
            page={page}
            pageCount={data?.totalPages ?? 1}
            onPageChange={setPage}
            totalItems={data?.totalData ?? 0}
            pageSize={PAGE_SIZE}
          />
        )}
      </Card>

      <ProductDetailsDrawer
        product={viewingProduct}
        open={!!viewingProduct}
        onOpenChange={(open) => !open && setViewingProduct(null)}
        onEdit={handleEdit}
      />

      <ProductFormDialog
        product={editingProduct ?? undefined}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingProduct(null);
        }}
        defaultIsComposite={false}
        trigger={null}
      />

      <ConfirmDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        title="Discontinue this component?"
        description={`"${deletingProduct?.name}" will be marked discontinued and hidden from active inventory. This can't be undone from the UI.`}
        confirmLabel="Discontinue component"
        onConfirm={handleDeleteConfirm}
        isPending={deleteProduct.isPending}
      />
    </div>
  );
}
