"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Loader2, MoreHorizontal, PackageCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { RequestStatusBadge } from "@/components/shared/status-badges";
import { useDecideProductRequest, useIssueProductRequest } from "@/hooks/queries/use-product-requests";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDate, formatQuantity } from "@/lib/utils";
import type { ProductRequest } from "@/types";

/** Rejection needs a reason — the backend rejects the call without one. */
function RejectDialog({
  request,
  open,
  onOpenChange,
}: {
  request: ProductRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = React.useState("");
  const decide = useDecideProductRequest();

  useResetOnOpen(open, () => setReason(""));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject request</DialogTitle>
          <DialogDescription>
            {formatQuantity(request.quantity)} × {request.product.name} requested by{" "}
            {request.requestedBy?.name ?? "an employee"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reject-reason">Reason for rejection *</Label>
          <Textarea
            id="reject-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Let the requester know why"
          />
          {reason.trim().length === 0 && (
            <p className="text-muted-foreground text-xs">Required — the requester is notified with this message.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={decide.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || decide.isPending}
            onClick={() =>
              decide.mutate(
                { id: request.id, payload: { status: "REJECTED", rejectionReason: reason.trim() } },
                {
                  onSuccess: () => {
                    toast.success("Request rejected");
                    onOpenChange(false);
                  },
                  onError: (e) => toast.error("Couldn't reject request", { description: getApiErrorMessage(e) }),
                },
              )
            }
          >
            {decide.isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
            Reject request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RefillsTable({ requests, isAdmin }: { requests: ProductRequest[]; isAdmin: boolean }) {
  const [rejecting, setRejecting] = React.useState<ProductRequest | null>(null);
  const decide = useDecideProductRequest();
  const issue = useIssueProductRequest();

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No requests"
        description={isAdmin ? "Employee material requests will appear here." : "You haven't submitted any requests yet."}
      />
    );
  }

  const approve = (request: ProductRequest) =>
    decide.mutate(
      { id: request.id, payload: { status: "APPROVED" } },
      {
        onSuccess: () => toast.success("Request approved", { description: "You can now issue the stock." }),
        onError: (e) => toast.error("Couldn't approve request", { description: getApiErrorMessage(e) }),
      },
    );

  const issueStock = (request: ProductRequest) =>
    issue.mutate(request.id, {
      onSuccess: () => toast.success("Stock issued", { description: "Inventory has been updated." }),
      onError: (e) => toast.error("Couldn't issue stock", { description: getApiErrorMessage(e) }),
    });

  const busy = (id: string) =>
    (decide.isPending && decide.variables?.id === id) || (issue.isPending && issue.variables === id);

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-44">Item</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Type</TableHead>
              {isAdmin && <TableHead className="min-w-36">Requested by</TableHead>}
              <TableHead>Task</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => {
              const isIssued = (r.stockMovements?.length ?? 0) > 0;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{r.product.name}</p>
                    <p className="text-muted-foreground text-xs">{r.product.sku ?? "No SKU"}</p>
                  </TableCell>
                  <TableCell className="tabular text-right text-sm font-medium">
                    {formatQuantity(r.quantity, r.product.unit)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.type === "TASK_RELATED" ? "secondary" : "muted"}>
                      {r.type === "TASK_RELATED" ? "Task" : "General"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={r.requestedBy?.name ?? "?"} size="size-7" />
                        <span className="truncate text-sm">{r.requestedBy?.name ?? "—"}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground max-w-36 truncate text-sm">
                    {r.task?.title ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(r.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <RequestStatusBadge status={r.status} isFulfilled={isIssued} />
                      {r.status === "REJECTED" && r.rejectionReason && (
                        <span className="text-muted-foreground max-w-40 truncate text-xs" title={r.rejectionReason}>
                          {r.rejectionReason}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Request actions">
                            {busy(r.id) ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {r.status === "PENDING" && (
                            <>
                              <DropdownMenuItem onClick={() => approve(r)}>
                                <CheckCircle2 className="size-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setRejecting(r)}>
                                <XCircle className="size-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {r.status === "APPROVED" && !isIssued && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => issueStock(r)}>
                                <PackageCheck className="size-4" />
                                Issue stock
                              </DropdownMenuItem>
                            </>
                          )}
                          {r.status === "APPROVED" && isIssued && (
                            <DropdownMenuItem disabled>
                              <PackageCheck className="size-4" />
                              Already issued
                            </DropdownMenuItem>
                          )}
                          {r.status === "REJECTED" && (
                            <DropdownMenuItem disabled>
                              <XCircle className="size-4" />
                              Rejected
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {rejecting && (
        <RejectDialog request={rejecting} open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)} />
      )}
    </>
  );
}
