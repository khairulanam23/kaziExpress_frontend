"use client";

import * as React from "react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { MOVEMENT_TYPE_META } from "@/components/shared/status-badges";
import { movementDirection, signedMovementQuantity } from "@/lib/calc";
import { cn, formatQuantity, formatRelativeTime } from "@/lib/utils";
import type { StockMovement } from "@/types";
import { History } from "lucide-react";

/**
 * Recent inventory activity as a timeline.
 *
 * Answers "who did what, to what, and when" in one line per event — the same
 * question the audit trail answers, but scannable at a glance.
 */
export function ActivityTimeline({
  movements,
  isLoading,
  limit = 8,
}: {
  movements?: StockMovement[];
  isLoading?: boolean;
  limit?: number;
}) {
  const items = (movements ?? []).slice(0, limit);

  return (
    <ChartCard title="Recent activity" description="The latest changes to stock across the business">
      {isLoading && !movements ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Purchases, production and adjustments will appear here as they happen."
        />
      ) : (
        <ol className="relative flex flex-col gap-4">
          {/* Spine connecting the events. */}
          <span className="bg-border absolute top-2 bottom-2 left-[15px] w-px" aria-hidden="true" />

          {items.map((m) => {
            const meta = MOVEMENT_TYPE_META[m.type];
            const Icon = meta?.icon ?? History;
            const dir = movementDirection(m.type);
            const qty = signedMovementQuantity(m);

            return (
              <li key={m.id} className="relative flex items-start gap-3">
                <span
                  className={cn(
                    "ring-card relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4",
                    dir > 0
                      ? "bg-success-soft text-success"
                      : dir < 0
                        ? "bg-destructive-soft text-destructive"
                        : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  <Icon className="size-3.5" />
                </span>

                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm">
                    <span className="font-medium">{m.performedBy?.name ?? "System"}</span>{" "}
                    <span className="text-muted-foreground">{(meta?.label ?? m.type).toLowerCase()}</span>{" "}
                    <span
                      className={cn(
                        "tabular font-semibold",
                        dir > 0 ? "text-success" : dir < 0 ? "text-destructive" : "",
                      )}
                    >
                      {dir > 0 ? "+" : ""}
                      {formatQuantity(dir === 0 ? Math.abs(qty) : qty)}
                    </span>{" "}
                    <span className="text-muted-foreground">of</span>{" "}
                    <span className="font-medium">{m.product?.name ?? "an item"}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatRelativeTime(m.createdAt)}
                    {m.reason || m.notes ? ` · ${m.reason ?? m.notes}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </ChartCard>
  );
}
