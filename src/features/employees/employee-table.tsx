"use client";

import * as React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { EmployeeActiveBadge } from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { User } from "@/types";
import { Trash2 } from "lucide-react";
import { payRateLabel } from "./employee-card";

/**
 * The dense view of the directory.
 *
 * Presentational: selection, deletion and the detail drawer belong to
 * `EmployeeDirectory`, which owns them for both views so a row and a card can
 * never behave differently.
 */
export function EmployeeTable({
  employees,
  currentUserId,
  onSelect,
  onDelete,
}: {
  employees: User[];
  currentUserId?: string;
  onSelect: (employee: User) => void;
  onDelete: (employee: User, event: React.MouseEvent) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Pay rate</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((e) => {
          const profile = e.employeeProfile;
          return (
            <TableRow
              key={e.id}
              className="cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => onSelect(e)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <UserAvatar name={e.name ?? e.email} imageUrl={e.avatarUrl} />
                  <div className="flex flex-col">
                    <span className="font-medium">{e.name ?? "—"}</span>
                    <span className="text-muted-foreground text-xs">{e.email}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={e.role === "ADMIN" ? "default" : "outline"} className="capitalize">
                  {e.role.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{profile?.department ?? "—"}</TableCell>
              <TableCell className="tabular">{payRateLabel(e)}</TableCell>
              <TableCell className="text-muted-foreground">
                {profile?.joinDate ? formatDate(profile.joinDate) : formatDate(e.createdAt)}
              </TableCell>
              <TableCell>
                <EmployeeActiveBadge isActive={e.isActive} />
              </TableCell>
              <TableCell className="text-right">
                {e.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive cursor-pointer"
                    aria-label={`Delete ${e.name ?? e.email}`}
                    onClick={(ev) => onDelete(e, ev)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
