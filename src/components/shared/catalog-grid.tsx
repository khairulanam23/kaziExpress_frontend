"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The column rule every catalogue grid shares.
 *
 * Four columns is the ceiling on the widest screen and one is the floor on the
 * narrowest; in between the grid steps 1 → 2 → 3 → 4 and the cards themselves
 * stretch to absorb whatever width is left over.
 *
 * The breakpoints are *container* queries, not viewport ones. A dashboard page
 * never gets the whole window — the sidebar takes a fixed slice and can be
 * collapsed — so a viewport breakpoint would put four columns into a space
 * that only fits three whenever the sidebar is open. Measuring the space the
 * cards are actually given is the only way the cap holds everywhere.
 */
export const CATALOG_GRID_CLASS =
  "grid grid-cols-1 items-stretch gap-4 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4";

export function CatalogGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="@container">
      <div className={cn(CATALOG_GRID_CLASS, className)}>{children}</div>
    </div>
  );
}
