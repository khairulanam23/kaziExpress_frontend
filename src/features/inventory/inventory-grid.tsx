"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ComponentCard, ComponentCardSkeleton } from "./component-card";
import type { Product } from "@/types";

/**
 * The catalogue grid.
 *
 * Columns come from `auto-fill` against a minimum card width rather than fixed
 * breakpoints, so the grid reflows at whatever width the sidebar happens to
 * leave rather than at guessed viewport sizes. Cards stretch to equal height so
 * a long product name never leaves a row ragged.
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] items-stretch gap-4">
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
    </div>
  );
}

/** Grid-shaped loading state, so switching from skeletons to cards doesn't jump. */
export function InventoryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] items-stretch gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ComponentCardSkeleton key={i} />
      ))}
    </div>
  );
}
