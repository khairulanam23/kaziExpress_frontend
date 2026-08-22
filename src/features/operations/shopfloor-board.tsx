"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Factory, Loader2, PackageCheck, Play, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { ProductThumb } from "@/components/shared/initials-avatar";
import { TASK_STATUS_META } from "@/components/shared/status-badges";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/constants/permissions";
import { useAcceptTask, useStartTask, useTasks } from "@/hooks/queries/use-tasks";
import { useAuthStore } from "@/store/auth-store";
import { getApiErrorMessage } from "@/lib/api-client";
import { taskProgress } from "@/lib/calc";
import { cn, formatDate, formatPercent, formatQuantity } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

/** Board columns in workflow order — the path a task actually travels. */
const COLUMNS: { status: TaskStatus; accent: string }[] = [
  { status: "PENDING", accent: "bg-warning" },
  { status: "ACCEPTED", accent: "bg-secondary" },
  { status: "IN_PROGRESS", accent: "bg-primary" },
  { status: "PARTIALLY_COMPLETED", accent: "bg-accent" },
  { status: "COMPLETED", accent: "bg-success" },
  { status: "CANCELLED", accent: "bg-destructive" },
];

const PAGE_SIZE = 200;

/**
 * One task, rendered so the essentials read before any text is parsed:
 * product image, a progress bar, who is on it, and how close it is to done.
 */
function TaskCard({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const accept = useAcceptTask();
  const start = useStartTask();

  const progress = taskProgress(task);
  const assigned = task.assignments ?? [];
  const isMine = assigned.some((a) => a.employeeId === user?.id);
  const busy =
    (accept.isPending && accept.variables === task.id) || (start.isPending && start.variables === task.id);

  const overdue =
    !!task.deadline &&
    new Date(task.deadline) < new Date() &&
    !["COMPLETED", "CANCELLED"].includes(task.status);

  return (
    <Card
      className="card-glow cursor-pointer gap-0 p-0 transition-shadow"
      onClick={() => onOpen(task.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task.id);
        }
      }}
      aria-label={`Open task ${task.title}`}
    >
      <div className="flex gap-3 p-3">
        <ProductThumb
          name={task.product?.name ?? task.title}
          imageUrl={task.product?.imageUrl}
          size="size-14"
          className="rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={task.title}>
            {task.title}
          </p>
          <p className="text-muted-foreground truncate text-xs">{task.product?.name ?? "No product"}</p>
          {isMine && (
            <Badge variant="secondary" className="mt-1">
              Assigned to you
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3">
        <div className="flex items-center gap-2">
          <Progress value={progress.completionPercentage} className="h-1.5 flex-1" />
          <span className="tabular text-xs font-semibold">{formatPercent(progress.completionPercentage)}</span>
        </div>
        <p className="text-muted-foreground tabular text-xs">
          {formatQuantity(progress.completed)} / {formatQuantity(progress.planned)} {task.product?.unit ?? "units"}
        </p>

        <div className="flex items-center justify-between gap-2">
          {assigned.length ? (
            <div className="flex -space-x-2">
              {assigned.slice(0, 3).map((a) => (
                <UserAvatar
                  key={a.id}
                  name={a.employee.name ?? a.employee.email ?? "?"}
                  size="size-6"
                  className="ring-card ring-2"
                />
              ))}
              {assigned.length > 3 && (
                <span className="bg-muted text-muted-foreground ring-card flex size-6 items-center justify-center rounded-full text-[10px] font-medium ring-2">
                  +{assigned.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Users className="size-3" />
              Unassigned
            </span>
          )}

          {task.deadline && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                overdue ? "text-destructive font-medium" : "text-muted-foreground",
              )}
            >
              <Clock className="size-3" />
              {overdue ? "Overdue" : formatDate(task.deadline)}
            </span>
          )}
        </div>

        {/* Inline shopfloor actions — large enough to tap on a phone. */}
        {(task.status === "PENDING" || task.status === "ACCEPTED") && (
          <PermissionGate permission={PERMISSIONS.PRODUCTION_REPORT}>
            <Button
              size="sm"
              variant={task.status === "PENDING" ? "default" : "outline"}
              className="h-9 w-full"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                if (task.status === "PENDING") {
                  accept.mutate(task.id, {
                    onSuccess: () => toast.success("Task accepted", { description: "Materials reserved." }),
                    onError: (err) => toast.error("Couldn't accept task", { description: getApiErrorMessage(err) }),
                  });
                } else {
                  start.mutate(task.id, {
                    onSuccess: () => toast.success("Task started"),
                    onError: (err) => toast.error("Couldn't start task", { description: getApiErrorMessage(err) }),
                  });
                }
              }}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : task.status === "PENDING" ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
              {task.status === "PENDING" ? "Accept" : "Start work"}
            </Button>
          </PermissionGate>
        )}

        {["IN_PROGRESS", "PARTIALLY_COMPLETED"].includes(task.status) && (
          <PermissionGate permission={PERMISSIONS.PRODUCTION_REPORT}>
            <Button
              size="sm"
              variant="outline"
              className="h-9 w-full"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(task.id);
              }}
            >
              <PackageCheck className="size-4" />
              Report production
            </Button>
          </PermissionGate>
        )}
      </div>
    </Card>
  );
}

/**
 * Kanban view of the production pipeline.
 *
 * Scrolls horizontally on narrow screens rather than collapsing, so the
 * left-to-right flow of the workflow stays legible on a phone.
 */
export function ShopfloorBoard({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const [search, setSearch] = React.useState("");
  const [mineOnly, setMineOnly] = React.useState(false);
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError, error, refetch } = useTasks({ pageNo: 1, showPerPage: PAGE_SIZE });

  const tasks = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.tasks ?? []).filter((t) => {
      if (mineOnly && !t.assignments?.some((a) => a.employeeId === user?.id)) return false;
      if (!term) return true;
      return (
        t.title.toLowerCase().includes(term) ||
        (t.product?.name ?? "").toLowerCase().includes(term) ||
        (t.product?.sku ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, search, mineOnly, user?.id]);

  const byStatus = React.useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    for (const col of COLUMNS) map.set(col.status, []);
    for (const t of tasks) map.get(t.status)?.push(t);
    return map;
  }, [tasks]);

  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks or products…"
            className="pl-9"
            aria-label="Search tasks"
          />
        </div>
        <Button
          variant={mineOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setMineOnly((v) => !v)}
          aria-pressed={mineOnly}
        >
          <Users className="size-4" />
          My tasks
        </Button>
      </div>

      {isLoading && !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={Factory}
          title={search || mineOnly ? "No matching tasks" : "Nothing on the shopfloor"}
          description={
            search || mineOnly
              ? "Try clearing the filters."
              : "Production tasks appear here once they're created."
          }
        />
      ) : (
        <div className="thin-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
          {COLUMNS.map((col) => {
            const meta = TASK_STATUS_META[col.status];
            const items = byStatus.get(col.status) ?? [];
            const Icon = meta.icon;

            return (
              <section
                key={col.status}
                className="flex w-72 shrink-0 flex-col gap-2.5"
                aria-label={`${meta.label} — ${items.length} tasks`}
              >
                <div className="bg-muted/50 sticky top-0 z-10 flex items-center gap-2 rounded-xl px-3 py-2">
                  <span className={cn("size-2 rounded-full", col.accent)} aria-hidden="true" />
                  <Icon className="text-muted-foreground size-3.5" aria-hidden="true" />
                  <span className="text-sm font-semibold">{meta.label}</span>
                  <Badge variant="muted" className="ml-auto">
                    {items.length}
                  </Badge>
                </div>

                <div className="flex flex-col gap-2.5">
                  {items.length === 0 ? (
                    <div className="border-border text-muted-foreground rounded-xl border border-dashed py-8 text-center text-xs">
                      Nothing here
                    </div>
                  ) : (
                    items.map((task) => <TaskCard key={task.id} task={task} onOpen={onOpenTask} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
