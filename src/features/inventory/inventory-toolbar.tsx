"use client";

import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PRODUCT_CATEGORIES } from "@/lib/validations/product";
import { cn } from "@/lib/utils";

export function InventoryToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  lowStockOnly,
  onLowStockOnlyChange,
  view,
  onViewChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  lowStockOnly: boolean;
  onLowStockOnlyChange: (v: boolean) => void;
  view: "list" | "grid";
  onViewChange: (v: "list" | "grid") => void;
}) {
  const activeFilters = (category !== "all" ? 1 : 0) + (lowStockOnly ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search by name…"
          className="pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="default" className="relative">
              <SlidersHorizontal className="size-4" /> Filter
              {activeFilters > 0 && (
                <span className="bg-primary text-primary-foreground tabular absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-[10px]">
                  {activeFilters}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={onCategoryChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium">Low stock only</span>
              <Switch checked={lowStockOnly} onCheckedChange={onLowStockOnlyChange} />
            </label>
          </PopoverContent>
        </Popover>

        <div className="border-border flex items-center rounded-lg border p-0.5">
          <button
            onClick={() => onViewChange("list")}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors",
              view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
            aria-label="List view"
          >
            <List className="size-4" />
          </button>
          <button
            onClick={() => onViewChange("grid")}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors",
              view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
