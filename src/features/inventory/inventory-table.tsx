"use client";

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ProductThumb } from "@/components/shared/initials-avatar";
import { ProductStockBadge } from "@/components/shared/status-badges";
import { ProductRowActions } from "./product-row-actions";
import { EmptyState } from "@/components/shared/states";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Product } from "@/types";
import { PackageSearch } from "lucide-react";

export function InventoryTable({
  products,
  onView,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No products found"
        description="Try adjusting your search or filters to find what you're looking for."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[22%]">Product</TableHead>
          <TableHead className="w-[8%]">Image</TableHead>
          <TableHead className="w-[12%]">Category</TableHead>
          <TableHead className="w-[10%]">Price</TableHead>
          <TableHead className="w-[10%]">Quantity</TableHead>
          <TableHead className="w-[13%]">Vendor</TableHead>
          <TableHead className="w-[10%]">Created</TableHead>
          <TableHead className="w-[10%]">Status</TableHead>
          <TableHead className="w-[5%] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((p) => {
          const category = (p.customFields?.category as string) ?? "Uncategorized";
          const threshold = p.lowStockThreshold ? Number(p.lowStockThreshold) : null;
          return (
            <TableRow key={p.id} className="cursor-pointer" onClick={() => onView(p)}>
              <TableCell className="w-[22%]">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="max-w-50 truncate font-medium">{p.name}</span>
                    {p.isComposite && (
                      <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                        Compound
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs">{p.sku ?? "No SKU"}</span>
                </div>
              </TableCell>
              <TableCell className="w-[8%]">
                <ProductThumb name={p.name} imageUrl={p.imageUrl} size="size-12" className="rounded-lg" />
              </TableCell>
              <TableCell className="w-[12%] text-muted-foreground">{category}</TableCell>
              <TableCell className="w-[10%] tabular font-medium">{formatCurrency(Number(p.unitPrice))}</TableCell>
              <TableCell className="w-[10%] tabular">{p.currentStock} units</TableCell>
              <TableCell className="w-[13%] text-muted-foreground max-w-37.5 truncate">{p.vendor?.name ?? "—"}</TableCell>
              <TableCell className="w-[10%] text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
              <TableCell className="w-[10%]">
                <ProductStockBadge currentStock={Number(p.currentStock)} lowStockThreshold={threshold} />
              </TableCell>
              <TableCell className="w-[5%] text-right" onClick={(e) => e.stopPropagation()}>
                <ProductRowActions product={p} onView={onView} onEdit={onEdit} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
