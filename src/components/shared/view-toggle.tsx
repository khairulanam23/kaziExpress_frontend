"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type CatalogView = "grid" | "list";

/**
 * Grid/list switcher shared by every catalogue screen.
 *
 * Grid comes first because it is the default everywhere. The list is kept
 * rather than dropped: cards read better when browsing, but a dense table is
 * still the faster way to compare a column of figures across many rows, and
 * that trade-off belongs to whoever is looking — not to the layout.
 */
export function ViewToggle({
  view,
  onViewChange,
  className,
}: {
  view: CatalogView;
  onViewChange: (view: CatalogView) => void;
  className?: string;
}) {
  const base =
    "flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors";
  const on = "bg-primary text-primary-foreground";
  const off = "text-muted-foreground hover:bg-muted";

  return (
    <div
      className={cn("border-border flex items-center rounded-lg border p-0.5", className)}
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => onViewChange("grid")}
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        className={cn(base, view === "grid" ? on : off)}
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onViewChange("list")}
        aria-label="List view"
        aria-pressed={view === "list"}
        className={cn(base, view === "list" ? on : off)}
      >
        <List className="size-4" />
      </button>
    </div>
  );
}
