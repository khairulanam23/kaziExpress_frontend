"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CatalogGrid } from "@/components/shared/catalog-grid";
import { ComponentCard, ComponentCardSkeleton } from "./component-card";
import type { Product } from "@/types";

/**
 * The catalogue grid.
 *
 * Columns come from `CatalogGrid`, which measures the space the cards are
 * actually given rather than the viewport, so the four-column ceiling holds
 * whether the sidebar is open or collapsed. Cards stretch to equal height so a
 * long product name never leaves a row ragged.
 *
 * Empty and error states are the page's concern, not the grid's — it renders
 * what it is given.
 */
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
  const reduceMotion = useReducedMotion();

  return (
    <CatalogGrid>
      {products.map((product, i) => (
        <motion.div
          key={product.id}
          className="h-full"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: Math.min(i, 8) * 0.03 }}
        >
          <ComponentCard product={product} onView={onView} onEdit={onEdit} onDelete={onDelete} />
        </motion.div>
      ))}
    </CatalogGrid>
  );
}

/** Grid-shaped loading state, so switching from skeletons to cards doesn't jump. */
export function InventoryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <CatalogGrid>
      {Array.from({ length: count }).map((_, i) => (
        <ComponentCardSkeleton key={i} />
      ))}
    </CatalogGrid>
  );
}
