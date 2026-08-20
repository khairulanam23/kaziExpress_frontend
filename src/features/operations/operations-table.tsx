"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Eye, Factory, Loader2, MoreHorizontal, PackageCheck, Play } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { TaskStatusBadge } from "@/components/shared/status-badges";
import { useAcceptTask, useStartTask } from "@/hooks/queries/use-tasks";
import { useAuthStore } from "@/store/auth-store";
import { getApiErrorMessage } from "@/lib/api-client";
import { taskProgress } from "@/lib/calc";
import { formatDate, formatPercent, formatQuantity } from "@/lib/utils";
import type { Task } from "@/types";

export function OperationsTable({ tasks, onOpenTask }: { tasks: Task[]; onOpenTask: (taskId: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const acceptTask = useAcceptTask();
  const startTask = useStartTask();

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={Factory}
        title="No production tasks"
        description={isAdmin ? "Create a task to start tracking production." : "You have no assigned tasks right now."}
      />
    );
  }

  const busy = (id: string) =>
    (acceptTask.isPending && acceptTask.variables === id) || (startTask.isPending && startTask.variables === id);

  const quickAccept = (task: Task) =>
    acceptTask.mutate(task.id, {
      onSuccess: () => toast.success("Task accepted", { description: "Materials reserved." }),
      onError: (err) => toast.error("Couldn't accept task", { description: getApiErrorMessage(err) }),
    });

  const quickStart = (task: Task) =>
    startTask.mutate(task.id, {
      onSuccess: () => toast.success("Task started"),
      onError: (err) => toast.error("Couldn't start task", { description: getApiErrorMessage(err) }),
    });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-56">Task</TableHead>
            <TableHead className="min-w-40">Product</TableHead>
            <TableHead className="min-w-44">Progress</TableHead>
            <TableHead>Assignees</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const progress = taskProgress(task);
            const isAssigned = task.assignments?.some((a) => a.employeeId === user?.id);
            const canAct = isAdmin || isAssigned;

            return (
              <TableRow key={task.id} className="cursor-pointer" onClick={() => onOpenTask(task.id)}>
                <TableCell>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-muted-foreground text-xs">by {task.createdBy?.name ?? "—"}</p>
                </TableCell>

                <TableCell>
                  <p className="text-sm">{task.product?.name ?? "—"}</p>
                  <p className="text-muted-foreground text-xs">{task.product?.sku ?? "No SKU"}</p>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Progress value={progress.completionPercentage} className="h-1.5 w-20" />
                      <span className="tabular text-xs font-medium">{formatPercent(progress.completionPercentage)}</span>
                    </div>
                    <span className="text-muted-foreground tabular text-xs">
                      {formatQuantity(progress.completed)}/{formatQuantity(progress.planned)} {task.product?.unit ?? ""}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  {task.assignments?.length ? (
                    <div className="flex -space-x-2">
                      {task.assignments.slice(0, 3).map((a) => (
                        <UserAvatar
                          key={a.id}
                          name={a.employee.name ?? a.employee.email ?? "?"}
                          size="size-7"
                          className="ring-card ring-2"
                        />
                      ))}
                      {task.assignments.length > 3 && (
                        <span className="bg-muted text-muted-foreground ring-card flex size-7 items-center justify-center rounded-full text-xs font-medium ring-2">
                          +{task.assignments.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">Unassigned</span>
                  )}
                </TableCell>

                <TableCell className="text-muted-foreground text-sm">{formatDate(task.deadline)}</TableCell>

                <TableCell>
                  <TaskStatusBadge status={task.status} />
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Task actions">
                        {busy(task.id) ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpenTask(task.id)}>
                        <Eye className="size-4" />
                        View details
                      </DropdownMenuItem>
                      {canAct && task.status === "PENDING" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => quickAccept(task)}>
                            <CheckCircle2 className="size-4" />
                            Accept & reserve
                          </DropdownMenuItem>
                        </>
                      )}
                      {canAct && task.status === "ACCEPTED" && (
                        <DropdownMenuItem onClick={() => quickStart(task)}>
                          <Play className="size-4" />
                          Start work
                        </DropdownMenuItem>
                      )}
                      {canAct && ["ACCEPTED", "IN_PROGRESS", "PARTIALLY_COMPLETED"].includes(task.status) && (
                        <DropdownMenuItem onClick={() => onOpenTask(task.id)}>
                          <PackageCheck className="size-4" />
                          Report production
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
