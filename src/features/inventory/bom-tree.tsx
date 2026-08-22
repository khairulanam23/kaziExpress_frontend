"use client";

import * as React from "react";
import { AlertTriangle, ChevronRight, Package, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { cn, formatQuantity, formatPercent } from "@/lib/utils";
import { percent, round } from "@/lib/calc";
import type { BOMTreeNode } from "@/types";

/**
 * One node in the bill-of-materials tree.
 *
 * Each row reports coverage — how much of the required quantity current stock
 * actually supports — so a shortage is visible without reading the numbers.
 * Depth is drawn with connector rails rather than indentation alone, which
 * keeps deep trees readable.
 */
function TreeNode({
  node,
  multiplier,
  depth,
  isLast,
}: {
  node: BOMTreeNode;
  /** Units of the *root* product this subtree is being built for. */
  multiplier: number;
  depth: number;
  isLast: boolean;
}) {
  const [open, setOpen] = React.useState(depth < 2);

  const required = round(node.quantityRequired * multiplier, 3);
  const available = node.currentStock;
  const coverage = required > 0 ? percent(Math.min(available, required), required) : 100;
  const shortage = round(Math.max(0, required - available), 3);
  const hasChildren = node.children.length > 0;

  return (
    <li className="relative">
      {/* Connector rails from the parent row. */}
      {depth > 0 && (
        <>
          <span
            className={cn("bg-border absolute -left-4 w-px", isLast ? "top-0 h-5" : "top-0 h-full")}
            aria-hidden="true"
          />
          <span className="bg-border absolute -left-4 top-5 h-px w-4" aria-hidden="true" />
        </>
      )}

      <div
        className={cn(
          "border-border bg-card flex flex-col gap-2 rounded-xl border p-3 transition-colors",
          shortage > 0 && "border-warning/40 bg-warning-soft/20",
        )}
      >
        <div className="flex items-start gap-2.5">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`}
              className="hover:bg-muted mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors"
            >
              <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
            </button>
          ) : (
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center" aria-hidden="true">
              <span className="bg-border size-1.5 rounded-full" />
            </span>
          )}

          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              node.isComposite ? "bg-primary-soft text-primary" : "bg-secondary-soft text-secondary",
            )}
            aria-hidden="true"
          >
            {node.isComposite ? <Workflow className="size-4" /> : <Package className="size-4" />}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-medium">{node.name}</span>
              {node.isComposite && <Badge variant="secondary">Sub-assembly</Badge>}
            </div>
            <p className="text-muted-foreground text-xs">{node.sku ?? "No SKU"}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="tabular text-sm font-semibold">{formatQuantity(required)}</p>
            <p className="text-muted-foreground text-xs">needed</p>
          </div>
        </div>

        {/* Stock coverage for this line. */}
        <div className="flex items-center gap-2 pl-8">
          <Progress value={coverage} className="h-1.5 flex-1" />
          <span className="tabular text-muted-foreground w-24 text-right text-xs">
            {formatQuantity(available)} in stock
          </span>
          {shortage > 0 ? (
            <Badge variant="warning" className="shrink-0">
              <AlertTriangle />
              Short {formatQuantity(shortage)}
            </Badge>
          ) : (
            <Badge variant="success" className="shrink-0">
              {formatPercent(coverage)}
            </Badge>
          )}
        </div>
      </div>

      {hasChildren && open && (
        <ul className="mt-2.5 ml-8 flex flex-col gap-2.5">
          {node.children.map((child, i) => (
            <TreeNode
              key={`${child.productId}-${i}`}
              node={child}
              // A sub-assembly's own components scale by how many of it we need.
              multiplier={required}
              depth={depth + 1}
              isLast={i === node.children.length - 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Visual bill of materials.
 *
 * Shows the recipe as a hierarchy rather than a flat list, because what people
 * need to see is which branch is short — not a column of numbers.
 */
export function BOMTree({
  bom,
  quantity = 1,
  isLoading,
  onConfigure,
}: {
  bom?: BOMTreeNode;
  /** Units of the finished product to plan for. */
  quantity?: number;
  isLoading?: boolean;
  onConfigure?: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!bom || bom.children.length === 0) {
    return (
      <EmptyState
        icon={Workflow}
        title="No bill of materials"
        description="This item has no components recorded, so producing it consumes nothing."
        action={onConfigure ? <button onClick={onConfigure} className="text-primary text-sm font-medium">Configure BOM</button> : undefined}
      />
    );
  }

  const shortages = bom.children.filter((c) => c.quantityRequired * quantity > c.currentStock).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Root product */}
      <div className="border-primary/30 bg-primary-soft/40 flex items-center gap-3 rounded-xl border p-3">
        <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Package className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{bom.name}</p>
          <p className="text-muted-foreground text-xs">
            Building {formatQuantity(quantity)} · {bom.children.length} direct component
            {bom.children.length === 1 ? "" : "s"}
          </p>
        </div>
        {shortages > 0 ? (
          <Badge variant="warning">
            <AlertTriangle />
            {shortages} short
          </Badge>
        ) : (
          <Badge variant="success">Fully covered</Badge>
        )}
      </div>

      <ul className="ml-4 flex flex-col gap-2.5">
        {bom.children.map((child, i) => (
          <TreeNode
            key={`${child.productId}-${i}`}
            node={child}
            multiplier={quantity}
            depth={1}
            isLast={i === bom.children.length - 1}
          />
        ))}
      </ul>
    </div>
  );
}
