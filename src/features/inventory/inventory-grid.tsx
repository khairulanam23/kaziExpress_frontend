"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ProductThumb } from "@/components/shared/initials-avatar";
import { ProductStockBadge } from "@/components/shared/status-badges";
import { ProductRowActions } from "./product-row-actions";
import { EmptyState } from "@/components/shared/states";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { PackageSearch } from "lucide-react";

export function InventoryGrid({
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => {
        const category = (p.customFields?.category as string) ?? "Uncategorized";
        const threshold = p.lowStockThreshold ? Number(p.lowStockThreshold) : null;
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03 }}
          >
            <Card
              className="cursor-pointer gap-4 py-5 hover:shadow-[0_12px_28px_-14px_rgba(15,23,42,0.25)]"
              onClick={() => onView(p)}
            >
              <div className="flex items-start justify-between px-5">
                <ProductThumb name={p.name} imageUrl={p.imageUrl} size="size-12" className="rounded-xl text-sm" />
                <div onClick={(e) => e.stopPropagation()}>
                  <ProductRowActions product={p} onView={onView} onEdit={onEdit} onDelete={onDelete} />
                </div>
              </div>
              <div className="flex flex-col gap-1 px-5">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{p.name}</p>
                  {p.isComposite && (
                    <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0">
                      Compound
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {p.sku ?? "No SKU"} · {category}
                </p>
              </div>
              <div className="flex items-center justify-between px-5">
                <span className="tabular font-semibold">{formatCurrency(Number(p.unitPrice))}</span>
                <ProductStockBadge currentStock={Number(p.currentStock)} lowStockThreshold={threshold} />
              </div>
              <div className="text-muted-foreground px-5 text-xs">{p.currentStock} units in stock</div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
