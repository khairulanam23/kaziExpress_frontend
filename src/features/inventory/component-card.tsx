"use client";

import * as React from "react";
import { Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductMedia } from "@/components/shared/initials-avatar";
import { ProductStockBadge } from "@/components/shared/status-badges";
import { StockIndicator } from "@/components/shared/stock-indicator";
import { ProductRowActions } from "./product-row-actions";
import { productCategoryName, productCategoryNames, productVendorName, productVendorNames } from "./product-meta";
import { num } from "@/lib/calc";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/utils";
import type { Product } from "@/types";

/**
 * A component presented as a catalogue card.
 *
 * Purely presentational: stock level, price formatting and which actions are
 * offered all come from the same helpers the table uses, so the two views can
 * never disagree about the same product.
 *
 * Everything the table column set showed is still here — name, SKU, image,
 * category, vendor, price, quantity, status and created date — reorganised
 * rather than dropped, with the full value available on hover where a long
 * name has to be truncated to fit.
 */
export function ComponentCard({
  product,
  onView,
  onEdit,
  onDelete,
}: {
  product: Product;
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  const category = productCategoryName(product);
  const vendor = productVendorName(product);
  const allCategories = productCategoryNames(product);
  const allVendors = productVendorNames(product);
  const threshold = product.lowStockThreshold === null ? null : num(product.lowStockThreshold);

  return (
    <Card
      className="group focus-within:ring-ring/50 relative flex h-full flex-col gap-0 overflow-hidden p-0 transition-shadow duration-200 hover:shadow-[0_14px_32px_-18px_rgba(15,23,42,0.35)] focus-within:ring-2"
    >
      {/* Media */}
      <div className="relative">
        {/* Shorter on phones, where a 4:3 block would eat most of the screen. */}
        <ProductMedia
          name={product.name}
          imageUrl={product.imageUrl}
          aspect="aspect-[16/9] sm:aspect-[4/3]"
        />

        {/* Status sits on the image so it is readable before anything is read. */}
        <div className="absolute top-2.5 left-2.5">
          <ProductStockBadge currentStock={num(product.currentStock)} lowStockThreshold={threshold} />
        </div>

        {/*
          Always rendered rather than revealed on hover — hover does not exist
          on touch, and this is the only route to Edit and Delete.
        */}
        <div className="absolute top-2 right-2">
          <ProductRowActions
            product={product}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            className="bg-background/85 hover:bg-background border-border/60 size-8 rounded-lg border backdrop-blur-sm"
          />
        </div>

        {product.isComposite && (
          <span className="bg-background/85 text-primary border-primary/25 absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
            <Layers className="size-3" aria-hidden />
            Compound
          </span>
        )}
      </div>

      {/* Identity — the whole block is the click target for details. */}
      <button
        type="button"
        onClick={() => onView(product)}
        className="flex flex-col items-start gap-0.5 px-4 pt-3 text-left outline-none"
        aria-label={`View details for ${product.name}`}
      >
        <span className="line-clamp-2 text-sm leading-snug font-semibold" title={product.name}>
          {product.name}
        </span>
        <span className="text-muted-foreground font-mono text-xs">{product.sku ?? "No SKU"}</span>
      </button>

      {/* Metadata */}
      <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 px-4">
        <div className="min-w-0">
          <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Category</dt>
          <dd className="truncate text-xs" title={allCategories.join(", ") || "Uncategorised"}>
            {category ?? <span className="text-muted-foreground">Uncategorised</span>}
            {allCategories.length > 1 && (
              <span className="text-muted-foreground"> +{allCategories.length - 1}</span>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Vendor</dt>
          <dd className="truncate text-xs" title={allVendors.join(", ") || "No vendor"}>
            {vendor ?? <span className="text-muted-foreground">No vendor</span>}
            {allVendors.length > 1 && <span className="text-muted-foreground"> +{allVendors.length - 1}</span>}
          </dd>
        </div>
      </dl>

      {/* Stock: the bar carries the level, the text carries the number. */}
      <div className="mt-3 px-4">
        <StockIndicator
          currentStock={product.currentStock}
          lowStockThreshold={product.lowStockThreshold}
          unit={product.unit}
          size="sm"
        />
      </div>

      {/* Price and quantity — the two figures a buyer scans for. */}
      <div className="border-border/60 mt-auto flex items-end justify-between gap-2 border-t px-4 py-3">
        <div className="min-w-0">
          <p className="tabular truncate text-base leading-tight font-bold">
            {formatCurrency(num(product.unitPrice))}
          </p>
          <p className="text-muted-foreground text-[11px]">per {product.unit}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular text-sm leading-tight font-semibold">
            {formatQuantity(product.currentStock)}
          </p>
          <p className="text-muted-foreground text-[11px]">{product.unit} available</p>
        </div>
      </div>

      {/* Least-important field, kept accessible rather than dropped. */}
      <p className="text-muted-foreground border-border/60 border-t px-4 py-2 text-[11px]">
        Added {formatDate(product.createdAt)}
      </p>
    </Card>
  );
}

/** Matches the card's structure so nothing shifts when the data lands. */
export function ComponentCardSkeleton() {
  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden p-0">
      <Skeleton className="aspect-[16/9] w-full rounded-none sm:aspect-[4/3]" />
      <div className="flex flex-col gap-2 px-4 pt-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 px-4">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
      </div>
      <div className="mt-3 px-4">
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="border-border/60 mt-3 flex items-center justify-between border-t px-4 py-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="border-border/60 border-t px-4 py-2">
        <Skeleton className="h-3 w-24" />
      </div>
    </Card>
  );
}

