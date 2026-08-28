"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { EmployeeActiveBadge } from "@/components/shared/status-badges";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { User } from "@/types";

/** Pay rate reads the same in the card as in the table row. */
export function payRateLabel(employee: User): string {
  const profile = employee.employeeProfile;
  if (!profile) return "—";
  return profile.payCalculationMode === "HOURLY"
    ? `${formatCurrency(Number(profile.hourlyRate))}/hr`
    : `${formatCurrency(Number(profile.dailyRate ?? 0))}/day`;
}

/**
 * An employee presented as a directory card.
 *
 * Carries everything the table row did — avatar, name, email, role,
 * department, pay rate, join date, status and the delete action — with the
 * photo given the room a directory wants. Delete stops propagation so it can
 * never be mistaken for opening the person's record.
 */
export function EmployeeCard({
  employee,
  canDelete,
  onSelect,
  onDelete,
}: {
  employee: User;
  canDelete: boolean;
  onSelect: (employee: User) => void;
  onDelete: (employee: User, event: React.MouseEvent) => void;
}) {
  const profile = employee.employeeProfile;
  const name = employee.name ?? employee.email;

  return (
    <Card className="group focus-within:ring-ring/50 relative flex h-full flex-col gap-0 p-0 transition-shadow duration-200 hover:shadow-[0_14px_32px_-18px_rgba(15,23,42,0.35)] focus-within:ring-2">
      {canDelete && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive absolute top-2 right-2 z-10 cursor-pointer"
          aria-label={`Delete ${name}`}
          onClick={(event) => onDelete(employee, event)}
        >
          <Trash2 className="size-4" />
        </Button>
      )}

      <button
        type="button"
        onClick={() => onSelect(employee)}
        className="flex flex-col items-center gap-2 px-4 pt-6 pb-3 text-center outline-none"
        aria-label={`View record for ${name}`}
      >
        <UserAvatar name={name} imageUrl={employee.avatarUrl} size="size-16" />
        <span className="mt-1 line-clamp-1 text-sm font-semibold" title={employee.name ?? "—"}>
          {employee.name ?? "—"}
        </span>
        <span className="text-muted-foreground line-clamp-1 text-xs" title={employee.email}>
          {employee.email}
        </span>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          <Badge variant={employee.role === "ADMIN" ? "default" : "outline"} className="capitalize">
            {employee.role.toLowerCase()}
          </Badge>
          <EmployeeActiveBadge isActive={employee.isActive} />
        </div>
      </button>

      <dl className="border-border/60 mt-auto grid grid-cols-2 gap-x-3 gap-y-2 border-t px-4 py-3">
        <div className="min-w-0">
          <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Department</dt>
          <dd className="truncate text-xs" title={profile?.department ?? "—"}>
            {profile?.department ?? <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Pay rate</dt>
          <dd className="tabular truncate text-xs">{payRateLabel(employee)}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Joined</dt>
          <dd className="text-xs">
            {profile?.joinDate ? formatDate(profile.joinDate) : formatDate(employee.createdAt)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

/** Matches the card's structure so nothing shifts when the data lands. */
export function EmployeeCardSkeleton() {
  return (
    <Card className="flex h-full flex-col gap-0 p-0">
      <div className="flex flex-col items-center gap-2 px-4 pt-6 pb-3">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="mt-1 h-4 w-24" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-1 h-5 w-20" />
      </div>
      <div className="border-border/60 mt-auto grid grid-cols-2 gap-3 border-t px-4 py-3">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
      </div>
    </Card>
  );
}
