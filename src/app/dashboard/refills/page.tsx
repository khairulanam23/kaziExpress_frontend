"use client";

import * as React from "react";
import { CheckCircle2, ClipboardList, Clock, Search, XCircle } from "lucide-react";
import { SectionHeader } from "@/components/shared/chart-card";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateRefillDialog } from "@/features/refills/create-refill-dialog";
import { RefillsTable } from "@/features/refills/refills-table";
import { useProductRequests } from "@/hooks/queries/use-product-requests";
import { useAuthStore } from "@/store/auth-store";
import { formatNumber } from "@/lib/utils";
import type { ProductRequestStatus, ProductRequestType } from "@/types";

const PAGE_SIZE = 15;

export default function RequestsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const [status, setStatus] = React.useState<ProductRequestStatus | "all">("all");
  const [type, setType] = React.useState<ProductRequestType | "all">("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const { data, isLoading, isError, error, refetch } = useProductRequests({
    status: status === "all" ? undefined : status,
    type: type === "all" ? undefined : type,
    pageNo: page,
    showPerPage: PAGE_SIZE,
  });

  const { data: pending } = useProductRequests({ status: "PENDING", showPerPage: 1 });
  const { data: approved } = useProductRequests({ status: "APPROVED", showPerPage: 1 });
  const { data: rejected } = useProductRequests({ status: "REJECTED", showPerPage: 1 });

  const term = search.trim().toLowerCase();
  const requests = (data?.requests ?? []).filter(
    (r) =>
      !term ||
      r.product.name.toLowerCase().includes(term) ||
      (r.requestedBy?.name ?? "").toLowerCase().includes(term) ||
      (r.task?.title ?? "").toLowerCase().includes(term),
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Material requests"
        description={
          isAdmin
            ? "Review, approve and issue material requests from your team."
            : "Request materials and track the status of your requests."
        }
        action={!isAdmin ? <CreateRefillDialog /> : undefined}
      />

      {isLoading && !data ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total requests" value={formatNumber(data?.totalData ?? 0)} icon={ClipboardList} accent="primary" helper="Matching current filters" />
          <StatCard
            label="Awaiting review"
            value={formatNumber(pending?.totalData ?? 0)}
            icon={Clock}
            accent={pending?.totalData ? "warning" : "success"}
            helper={isAdmin ? "Needs your decision" : "Waiting on an admin"}
          />
          <StatCard label="Approved" value={formatNumber(approved?.totalData ?? 0)} icon={CheckCircle2} accent="success" helper="Ready to issue or already issued" />
          <StatCard label="Rejected" value={formatNumber(rejected?.totalData ?? 0)} icon={XCircle} accent="destructive" helper="Declined requests" />
        </div>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <Label className="text-muted-foreground mb-1 text-xs">Search</Label>
            <Search className="text-muted-foreground pointer-events-none absolute bottom-2.5 left-3 size-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Item, requester or task…"
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground text-xs">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as ProductRequestStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground text-xs">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as ProductRequestType | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="TASK_RELATED">Task-related</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isError ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={() => refetch()} />
          </div>
        ) : isLoading && !data ? (
          <TableSkeleton rows={8} />
        ) : (
          <>
            <div className="p-0">
              {requests.length === 0 ? (
                <div className="p-4">
                  <RefillsTable requests={[]} isAdmin={isAdmin} />
                </div>
              ) : (
                <RefillsTable requests={requests} isAdmin={isAdmin} />
              )}
            </div>
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
    </div>
  );
}
