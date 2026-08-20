"use client";

import { Ban, CheckCircle2, Clock, PauseCircle, Play, ThumbsUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import type { TaskStatus } from "@/types";

const CARDS: { status: TaskStatus; label: string; icon: typeof Clock; accent: string }[] = [
  { status: "PENDING", label: "Pending", icon: Clock, accent: "text-warning bg-warning-soft" },
  { status: "ACCEPTED", label: "Accepted", icon: ThumbsUp, accent: "text-secondary bg-secondary-soft" },
  { status: "IN_PROGRESS", label: "In progress", icon: Play, accent: "text-primary bg-primary-soft" },
  { status: "PARTIALLY_COMPLETED", label: "Partial", icon: PauseCircle, accent: "text-accent bg-accent-soft" },
  { status: "COMPLETED", label: "Completed", icon: CheckCircle2, accent: "text-success bg-success-soft" },
  { status: "CANCELLED", label: "Cancelled", icon: Ban, accent: "text-destructive bg-destructive-soft" },
];

/** Clickable status filter tiles — the active one is outlined, not just tinted. */
export function TaskStatusCards({
  counts,
  active,
  onSelect,
}: {
  counts: Partial<Record<TaskStatus, number>>;
  active: TaskStatus | "all";
  onSelect: (status: TaskStatus | "all") => void;
}) {
  const total = CARDS.reduce((sum, c) => sum + (counts[c.status] ?? 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
      <button type="button" onClick={() => onSelect("all")} className="text-left">
        <Card
          className={cn(
            "hover:border-primary/40 h-full gap-1 p-3 transition-colors",
            active === "all" && "border-primary ring-primary/20 ring-2",
          )}
        >
          <span className="text-muted-foreground text-xs">All tasks</span>
          <span className="tabular text-xl font-bold">{formatNumber(total)}</span>
        </Card>
      </button>

      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <button key={card.status} type="button" onClick={() => onSelect(card.status)} className="text-left">
            <Card
              className={cn(
                "hover:border-primary/40 h-full gap-1 p-3 transition-colors",
                active === card.status && "border-primary ring-primary/20 ring-2",
              )}
            >
              <span className={cn("flex size-7 items-center justify-center rounded-lg", card.accent)}>
                <Icon className="size-3.5" />
              </span>
              <span className="tabular text-xl font-bold">{formatNumber(counts[card.status] ?? 0)}</span>
              <span className="text-muted-foreground text-xs">{card.label}</span>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
