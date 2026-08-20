"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle2,
  Factory,
  Layers,
  Loader2,
  Package,
  PackageCheck,
  Play,
  Truck,
  User,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { TaskStatusBadge } from "@/components/shared/status-badges";
import { useAcceptTask, useCancelTask, useStartTask, useTask } from "@/hooks/queries/use-tasks";
import { useAuthStore } from "@/store/auth-store";
import { getApiErrorMessage } from "@/lib/api-client";
import { batchAvailable, taskProgress } from "@/lib/calc";
import { formatDate, formatDateTime, formatMoney, formatPercent, formatQuantity } from "@/lib/utils";
import { ReportDamageDialog, ReportProductionDialog, RequestRefillDialog } from "./task-workflow-dialogs";

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Package; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
        <Icon className="size-3.5" />
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-border/50 flex items-center justify-between gap-3 border-b py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

export function TaskDetailDrawer({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const { data: task, isLoading, isError, error, refetch } = useTask(open ? taskId : null);

  const acceptTask = useAcceptTask();
  const startTask = useStartTask();
  const cancelTask = useCancelTask();

  const [productionOpen, setProductionOpen] = React.useState(false);
  const [damageOpen, setDamageOpen] = React.useState(false);
  const [refillOpen, setRefillOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const progress = task ? taskProgress(task) : null;

  const isAssigned = !!task?.assignments?.some((a) => a.employeeId === user?.id);
  const canAct = isAdmin || isAssigned;

  const canAccept = canAct && task?.status === "PENDING";
  const canStart = canAct && (task?.status === "ACCEPTED" || task?.status === "PENDING");
  const canReport =
    canAct && !!task && ["ACCEPTED", "IN_PROGRESS", "PARTIALLY_COMPLETED"].includes(task.status) && (progress?.remaining ?? 0) > 0;
  const canCancel = isAdmin && !!task && !["COMPLETED", "CANCELLED"].includes(task.status);

  const handleAccept = () =>
    task &&
    acceptTask.mutate(task.id, {
      onSuccess: () => toast.success("Task accepted", { description: "Allocated materials are now reserved for you." }),
      onError: (err) => toast.error("Couldn't accept task", { description: getApiErrorMessage(err) }),
    });

  const handleStart = () =>
    task &&
    startTask.mutate(task.id, {
      onSuccess: () => toast.success("Task started"),
      onError: (err) => toast.error("Couldn't start task", { description: getApiErrorMessage(err) }),
    });

  const handleCancel = () =>
    task &&
    cancelTask.mutate(task.id, {
      onSuccess: () => {
        toast.success("Task cancelled", { description: "Reserved inventory has been released." });
        setCancelOpen(false);
        onOpenChange(false);
      },
      onError: (err) => toast.error("Couldn't cancel task", { description: getApiErrorMessage(err) }),
    });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {isLoading ? (
            <div className="flex flex-col gap-4 p-6">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <div className="p-6">
              <ErrorState error={error} onRetry={() => refetch()} />
            </div>
          ) : !task ? null : (
            <>
              <SheetHeader className="mb-2">
                <div className="flex items-start gap-3">
                  <div className="bg-primary-soft text-primary mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <Factory className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-lg leading-snug">{task.title}</SheetTitle>
                    <SheetDescription asChild>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <TaskStatusBadge status={task.status} />
                        {task.deadline && (
                          <Badge variant="outline">
                            <CalendarDays />
                            Due {formatDate(task.deadline)}
                          </Badge>
                        )}
                      </div>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex flex-col gap-6 px-6 pb-6">
                {/* Actions */}
                {(canAccept || canStart || canReport || canCancel) && (
                  <div className="flex flex-wrap gap-2">
                    {canAccept && (
                      <Button size="sm" onClick={handleAccept} disabled={acceptTask.isPending}>
                        {acceptTask.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                        Accept & reserve
                      </Button>
                    )}
                    {canStart && (
                      <Button size="sm" variant={canAccept ? "outline" : "default"} onClick={handleStart} disabled={startTask.isPending}>
                        {startTask.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                        Start work
                      </Button>
                    )}
                    {canReport && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setProductionOpen(true)}>
                          <PackageCheck className="size-4" />
                          Report production
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRefillOpen(true)}>
                          <Truck className="size-4" />
                          Request refill
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDamageOpen(true)}>
                          <AlertTriangle className="size-4" />
                          Report damage
                        </Button>
                      </>
                    )}
                    {canCancel && (
                      <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>
                        <Ban className="size-4" />
                        Cancel task
                      </Button>
                    )}
                  </div>
                )}

                {!canAct && (
                  <div className="border-warning/30 bg-warning-soft/40 rounded-xl border p-3 text-xs">
                    You&apos;re not assigned to this task, so you can only view it.
                  </div>
                )}

                {/* Progress */}
                {progress && (
                  <Section title="Production progress" icon={Factory}>
                    <div className="bg-muted/40 flex flex-col gap-2 rounded-xl p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="tabular font-semibold">
                          {formatQuantity(progress.completed)} / {formatQuantity(progress.planned)}{" "}
                          {task.product?.unit ?? "units"}
                        </span>
                        <Badge variant={progress.isFullyCompleted ? "success" : "secondary"}>
                          {formatPercent(progress.completionPercentage)}
                        </Badge>
                      </div>
                      <Progress value={progress.completionPercentage} />
                      <p className="text-muted-foreground text-xs">
                        {formatQuantity(progress.remaining)} {task.product?.unit ?? "units"} remaining
                      </p>
                    </div>
                  </Section>
                )}

                {/* Details */}
                <Section title="Details" icon={Package}>
                  <div className="flex flex-col">
                    <InfoRow label="Product">{task.product?.name ?? "—"}</InfoRow>
                    <InfoRow label="SKU">{task.product?.sku ?? "—"}</InfoRow>
                    <InfoRow label="Created by">{task.createdBy?.name ?? "—"}</InfoRow>
                    <InfoRow label="Created">{formatDateTime(task.createdAt)}</InfoRow>
                    <InfoRow label="Accepted">{formatDateTime(task.acceptedAt)}</InfoRow>
                    <InfoRow label="Started">{formatDateTime(task.startedAt)}</InfoRow>
                    <InfoRow label="Completed">{formatDateTime(task.completedAt)}</InfoRow>
                    {task.completedBy && <InfoRow label="Completed by">{task.completedBy.name ?? "—"}</InfoRow>}
                  </div>
                  {task.description && <p className="text-muted-foreground mt-2 text-sm">{task.description}</p>}
                </Section>

                {/* Assignees */}
                <Section title="Assigned to" icon={User}>
                  {task.assignments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nobody assigned yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {task.assignments.map((a) => (
                        <div key={a.id} className="flex items-center gap-2.5">
                          <UserAvatar name={a.employee.name ?? a.employee.email ?? "?"} size="size-8" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{a.employee.name ?? "Unnamed"}</p>
                            <p className="text-muted-foreground truncate text-xs">{a.employee.email}</p>
                          </div>
                          {a.employeeId === user?.id && <Badge variant="secondary">You</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Material requirements */}
                {!!task.requiredProducts?.length && (
                  <Section title="Material requirements" icon={Layers}>
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead className="text-right">Required</TableHead>
                            <TableHead className="text-right">Unit cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {task.requiredProducts.map((rp) => (
                            <TableRow key={rp.id}>
                              <TableCell>
                                <p className="font-medium">{rp.product.name}</p>
                                <p className="text-muted-foreground text-xs">{rp.product.sku ?? "No SKU"}</p>
                              </TableCell>
                              <TableCell className="tabular text-right">
                                {formatQuantity(rp.quantity, rp.unit ?? rp.product.unit)}
                              </TableCell>
                              <TableCell className="tabular text-right">
                                {rp.unitPrice !== null && rp.unitPrice !== undefined ? formatMoney(rp.unitPrice) : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Snapshot taken when the task was created — later BOM edits don&apos;t change it.
                    </p>
                  </Section>
                )}

                {/* Allocated batches */}
                {!!task.batchAllocations?.length && (
                  <Section title="Allocated batches" icon={Layers}>
                    <div className="flex flex-col gap-2">
                      {task.batchAllocations.map((a) => (
                        <div key={a.id} className="border-border/60 flex items-center gap-3 rounded-xl border px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{a.batch.product?.name ?? "—"}</p>
                            <p className="text-muted-foreground font-mono text-xs">{a.batch.batchNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="tabular text-sm font-semibold">{formatQuantity(a.allocatedQuantity)}</p>
                            <p className="text-muted-foreground text-xs">
                              {formatQuantity(batchAvailable(a.batch))} free
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Output batches */}
                {!!task.outputBatches?.length && (
                  <Section title="Output batches" icon={PackageCheck}>
                    <div className="flex flex-col gap-2">
                      {task.outputBatches.map((b) => (
                        <div key={b.id} className="border-success/25 bg-success-soft/30 flex items-center gap-3 rounded-xl border px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-sm">{b.batchNumber}</p>
                            <p className="text-muted-foreground text-xs">{formatDateTime(b.createdAt)}</p>
                          </div>
                          <span className="tabular text-sm font-semibold">{formatQuantity(b.remainingQuantity)}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {task && (
        <>
          <ReportProductionDialog task={task} open={productionOpen} onOpenChange={setProductionOpen} />
          <ReportDamageDialog task={task} open={damageOpen} onOpenChange={setDamageOpen} />
          <RequestRefillDialog task={task} open={refillOpen} onOpenChange={setRefillOpen} />
          <ConfirmDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            title="Cancel this task?"
            description={`"${task.title}" will be cancelled and any reserved inventory released back to stock. This can't be undone.`}
            confirmLabel="Cancel task"
            cancelLabel="Keep task"
            onConfirm={handleCancel}
            isPending={cancelTask.isPending}
          />
        </>
      )}
    </>
  );
}
