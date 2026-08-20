"use client";

import * as React from "react";
import { type LucideIcon, Inbox, Loader2, RefreshCw, ServerCrash, ShieldAlert, WifiOff, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getApiErrorKind, getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center",
        className,
      )}
    >
      <span className="bg-muted flex size-12 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Renders a failed query with copy matched to the failure class and a retry
 * button where retrying could plausibly help.
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const kind = getApiErrorKind(error);

  const meta: Record<string, { icon: LucideIcon; title: string; retryable: boolean }> = {
    forbidden: { icon: ShieldAlert, title: "You don't have access to this", retryable: false },
    notFound: { icon: SearchX, title: "Not found", retryable: false },
    network: { icon: WifiOff, title: "Can't reach the server", retryable: true },
    server: { icon: ServerCrash, title: "Something went wrong on the server", retryable: true },
    auth: { icon: ShieldAlert, title: "Your session has expired", retryable: false },
    validation: { icon: ServerCrash, title: "That request wasn't accepted", retryable: false },
    unknown: { icon: ServerCrash, title: "Something went wrong", retryable: true },
  };

  const { icon: Icon, title, retryable } = meta[kind] ?? meta.unknown;

  return (
    <div
      className={cn(
        "border-destructive/25 bg-destructive-soft/30 flex flex-col items-center justify-center gap-3 rounded-2xl border py-14 text-center",
        className,
      )}
    >
      <span className="bg-destructive-soft text-destructive flex size-12 items-center justify-center rounded-full">
        <Icon className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground max-w-md text-sm">{getApiErrorMessage(error)}</p>
      </div>
      {retryable && onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

/** Full-section spinner for first loads where no skeleton shape is meaningful. */
export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <Loader2 className="text-primary size-6 animate-spin" />
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}

/** Row-shaped skeletons so tables don't jump when data arrives. */
export function TableSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 p-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/** Shown when a route is reached by a role the backend would reject anyway. */
export function ForbiddenState({ description }: { description?: string }) {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="Restricted area"
      description={description ?? "This section is only available to administrators."}
    />
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  destructive = true,
  isPending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
  isPending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
