"use client";

import * as React from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Factory, Package, ShoppingCart } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBatchTrace } from "@/hooks/queries/use-analytics";
import { formatQuantity } from "@/lib/utils";
import type { TraceNode } from "@/types";

/**
 * Batch genealogy.
 *
 * `TaskBatchAllocation` (what a task consumed) and `InventoryBatch.sourceTaskId`
 * (what it produced) have always formed a graph; this walks it in both
 * directions. Upwards answers "what went into this"; downwards answers "this
 * supplier batch was defective — what did we build with it, and is any of it
 * still on the shelf".
 */

/** One node in the tree, with a connector rail so depth is legible without counting indents. */
function TraceBranch({ node, direction, isLast = true, depth = 0 }: { node: TraceNode; direction: "up" | "down"; isLast?: boolean; depth?: number }) {
  const made = !!node.producedByTask;

  return (
    <li className="relative pl-6">
      {depth > 0 && (
        <>
          <span className="border-border absolute top-0 left-0 h-4 w-4 rounded-bl-md border-b border-l" aria-hidden />
          {!isLast && <span className="border-border absolute top-4 left-0 h-full border-l" aria-hidden />}
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 py-1.5">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
            made ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
          }`}
          aria-hidden
        >
          {made ? <Factory className="size-3.5" /> : <ShoppingCart className="size-3.5" />}
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{node.product.name}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {node.batchNumber}
            </Badge>
            {made ? (
              <span className="text-muted-foreground text-xs">built in-house</span>
            ) : (
              <span className="text-muted-foreground text-xs">purchased</span>
            )}
          </div>
          <div className="text-muted-foreground text-xs">
            {node.quantityInThisLink !== null && (
              <span className="text-foreground font-medium">
                {formatQuantity(node.quantityInThisLink)} {node.product.unit ?? ""} used ·{" "}
              </span>
            )}
            {formatQuantity(node.remainingQuantity)} of {formatQuantity(node.initialQuantity)} left
            {node.producedByTask && ` · ${node.producedByTask.title}`}
          </div>
        </div>

        {node.truncated && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="size-3" />
            Chain continues beyond the trace limit
          </Badge>
        )}
      </div>

      {node.children.length > 0 && (
        <ul className="relative">
          {node.children.map((child, index) => (
            <TraceBranch
              key={`${child.batchId}-${index}`}
              node={child}
              direction={direction}
              isLast={index === node.children.length - 1}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function BatchTraceView({ batchId }: { batchId: string | null }) {
  const { data, isLoading, isError, error, refetch } = useBatchTrace(batchId);

  if (!batchId) return null;
  if (isLoading) return <LoadingState label="Tracing this batch" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const { summary } = data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="flex flex-col gap-1 p-3">
          <span className="text-muted-foreground text-xs">Origin</span>
          <span className="text-lg font-bold">{summary.isPurchased ? "Purchased" : "Built in-house"}</span>
          <span className="text-muted-foreground text-xs">
            {summary.isPurchased ? "No upstream materials" : `From ${summary.originBatches} source batch(es)`}
          </span>
        </Card>
        <Card className="flex flex-col gap-1 p-3">
          <span className="text-muted-foreground text-xs">Batches affected</span>
          <span className="tabular text-lg font-bold">{summary.affectedBatches}</span>
          <span className="text-muted-foreground text-xs">across {summary.affectedProducts} product(s)</span>
        </Card>
        <Card className="flex flex-col gap-1 p-3">
          <span className="text-muted-foreground text-xs">Still on the shelf</span>
          <span className={`tabular text-lg font-bold ${summary.stillInStock > 0 ? "text-warning" : ""}`}>
            {summary.stillInStock}
          </span>
          <span className="text-muted-foreground text-xs">
            {summary.stillInStock > 0 ? "Recoverable in a recall" : "Nothing left to recall"}
          </span>
        </Card>
        <Card className="flex flex-col gap-1 p-3">
          <span className="text-muted-foreground text-xs">Movements</span>
          <span className="tabular text-lg font-bold">{data.movements.length}</span>
          <span className="text-muted-foreground text-xs">recorded against this batch</span>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <ArrowUp className="text-muted-foreground size-4" aria-hidden />
            <h3 className="text-sm font-semibold">What went into this batch</h3>
          </div>
          {data.upstream.children.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              This batch was purchased rather than built, so it has no upstream materials.
            </p>
          ) : (
            <ul>
              <TraceBranch node={data.upstream} direction="up" />
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <ArrowDown className="text-muted-foreground size-4" aria-hidden />
            <h3 className="text-sm font-semibold">What was built from this batch</h3>
          </div>
          {data.downstream.children.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing has consumed this batch yet, so no finished goods depend on it.
            </p>
          ) : (
            <ul>
              <TraceBranch node={data.downstream} direction="down" />
            </ul>
          )}
        </Card>
      </div>

      {data.recallList.length > 0 && (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Package className="text-muted-foreground size-4" aria-hidden />
            <h3 className="text-sm font-semibold">Recall list</h3>
            <span className="text-muted-foreground text-xs">
              Everything that would be affected if this batch were found defective
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Steps away</TableHead>
                  <TableHead className="text-right">Still in stock</TableHead>
                  <TableHead>Produced by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recallList.map((row) => (
                  <TableRow key={row.batchId}>
                    <TableCell className="font-mono text-xs">{row.batchNumber}</TableCell>
                    <TableCell className="font-medium">{row.product.name}</TableCell>
                    <TableCell className="tabular text-right">{row.depth}</TableCell>
                    <TableCell className="tabular text-right">
                      {row.remainingQuantity > 0 ? (
                        <span className="text-warning font-semibold">
                          {formatQuantity(row.remainingQuantity)} {row.product.unit ?? ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{row.producedByTask?.title ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
