"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ViewToggle } from "@/components/shared/view-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PERMISSIONS } from "@/constants/permissions";
import { useCategories } from "@/hooks/queries/use-categories";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * Catalogue toolbar: search, filters and the view switcher.
 *
 * The category list comes from the categories the business actually has, not
 * from the hard-coded demo list this used to offer — that list held names like
 * "Audio" and "Gaming" which match nothing in this inventory, so most of the
 * dropdown silently returned zero results. Users without `CATEGORY_VIEW`
 * cannot read that endpoint, so the filter is simply not offered to them
 * rather than shown broken.
 */
export function InventoryToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  lowStockOnly,
  onLowStockOnlyChange,
  view,
  onViewChange,
  resultCount,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  lowStockOnly: boolean;
  onLowStockOnlyChange: (v: boolean) => void;
  view: "list" | "grid";
  onViewChange: (v: "list" | "grid") => void;
  resultCount?: number;
}) {
  const { has } = usePermissions();
  const canReadCategories = has(PERMISSIONS.CATEGORY_VIEW);
  const { data: categoryData } = useCategories(undefined, { enabled: canReadCategories });
  const categories = categoryData?.categories ?? [];

  const categoryName =
    category === "all" ? null : (categories.find((c) => c.id === category)?.name ?? category);
  const activeFilters = (category !== "all" ? 1 : 0) + (lowStockOnly ? 1 : 0);

  const clearAll = () => {
    onCategoryChange("all");
    onLowStockOnlyChange(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search components by name…"
            className="pl-9"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search components"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <SlidersHorizontal className="size-4" /> Filter
                {activeFilters > 0 && (
                  <span className="bg-primary text-primary-foreground tabular absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-[10px]">
                    {activeFilters}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-72 flex-col gap-4">
              {canReadCategories && (
                <div className="flex flex-col gap-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={onCategoryChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Low stock only</span>
                <Switch checked={lowStockOnly} onCheckedChange={onLowStockOnlyChange} />
              </label>

              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="self-start">
                  Clear filters
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Grid first — the catalogue is the primary way to browse now. */}
          <ViewToggle view={view} onViewChange={onViewChange} />
        </div>
      </div>

      {/* Active filters stay visible outside the popover, and are removable there. */}
      {(activeFilters > 0 || typeof resultCount === "number") && (
        <div className="flex flex-wrap items-center gap-2">
          {typeof resultCount === "number" && (
            <span className="text-muted-foreground text-xs">
              {resultCount} {resultCount === 1 ? "component" : "components"}
            </span>
          )}
          {categoryName && (
            <Badge variant="secondary" className="gap-1">
              Category: {categoryName}
              <button type="button" onClick={() => onCategoryChange("all")} aria-label="Remove category filter">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {lowStockOnly && (
            <Badge variant="secondary" className="gap-1">
              Low stock only
              <button type="button" onClick={() => onLowStockOnlyChange(false)} aria-label="Remove low stock filter">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
