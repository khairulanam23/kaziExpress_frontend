"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGrid, Search, X } from "lucide-react";
import { SectionHeader } from "@/components/shared/chart-card";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/constants/permissions";
import { Pagination } from "@/components/shared/pagination";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CreateTaskDialog } from "@/features/operations/create-task-dialog";
import { OperationsTable } from "@/features/operations/operations-table";
import { TaskStatusCards } from "@/features/operations/status-cards";
import { TaskDetailDrawer } from "@/features/operations/task-detail-drawer";
import { useTaskStatusCounts, useTasks } from "@/hooks/queries/use-tasks";
import { useAuthStore } from "@/store/auth-store";
import type { TaskStatus } from "@/types";

const PAGE_SIZE = 10;
const ALL_STATUSES: TaskStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "PARTIALLY_COMPLETED",
  "COMPLETED",
  "CANCELLED",
];

export default function OperationsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | "all">("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useTasks({
    status: statusFilter === "all" ? undefined : statusFilter,
    pageNo: page,
    showPerPage: PAGE_SIZE,
  });

  // One lightweight query per status drives the filter tiles' counts.
  const { counts } = useTaskStatusCounts(ALL_STATUSES);

  const term = search.trim().toLowerCase();
  const tasks = (data?.tasks ?? []).filter(
    (t) =>
      !term ||
      t.title.toLowerCase().includes(term) ||
      (t.product?.name ?? "").toLowerCase().includes(term) ||
      (t.product?.sku ?? "").toLowerCase().includes(term),
  );

  const handleStatusChange = (status: TaskStatus | "all") => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Production tasks"
        description={
          isAdmin
            ? "Create tasks, allocate material batches and track output through to finished stock."
            : "Accept your assigned tasks, report production and flag problems."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/shopfloor">
                <LayoutGrid className="size-4" />
                Board view
              </Link>
            </Button>
            <PermissionGate permission={PERMISSIONS.PRODUCTION_CREATE_TASK}>
              <CreateTaskDialog />
            </PermissionGate>
          </div>
        }
      />

      <TaskStatusCards counts={counts} active={statusFilter} onSelect={handleStatusChange} />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by task title, product or SKU…"
              className="pl-9"
            />
          </div>
          {(search || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                handleStatusChange("all");
              }}
            >
              <X className="size-4" />
              Clear filters
            </Button>
          )}
        </div>

        {isError ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={() => refetch()} />
          </div>
        ) : isLoading && !data ? (
          <TableSkeleton rows={6} />
        ) : (
          <>
            <OperationsTable tasks={tasks} onOpenTask={setOpenTaskId} />
            <div className="pb-4">
              <Pagination
                page={page}
                pageCount={data?.totalPages ?? 1}
                onPageChange={setPage}
                totalItems={data?.totalData ?? 0}
                pageSize={PAGE_SIZE}
              />
            </div>
          </>
        )}
      </Card>

      <TaskDetailDrawer taskId={openTaskId} open={!!openTaskId} onOpenChange={(open) => !open && setOpenTaskId(null)} />
    </div>
  );
}
