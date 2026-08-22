"use client";

import * as React from "react";
import { Search, ShieldCheck, Users } from "lucide-react";
import { SectionHeader } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { RoleBadge } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PermissionEditor } from "@/features/permissions/permission-editor";
import { usePermissionCatalog } from "@/hooks/queries/use-permissions-api";
import { useUsers } from "@/hooks/queries/use-users";
import { cn } from "@/lib/utils";

/**
 * Access control: pick an employee on the left, edit their permissions on the
 * right. Administrators are listed but shown as already holding everything.
 */
export default function PermissionsPage() {
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useUsers({ showPerPage: 200 });
  const { data: catalog } = usePermissionCatalog();

  const users = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = data?.users ?? [];
    if (!term) return all;
    return all.filter(
      (u) => (u.name ?? "").toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
    );
  }, [data, search]);

  // Land on the first employee so the page is never an empty right-hand pane.
  // Derived during render rather than in an effect, which would cost an extra
  // render pass every time the list loads.
  const activeId = selectedId ?? (users.find((u) => u.role === "EMPLOYEE") ?? users[0])?.id ?? null;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Permissions"
        description="Decide what each employee can see and do. Changes take effect the next time they load a page."
        action={
          catalog ? (
            <Badge variant="muted" className="gap-1.5 px-2.5 py-1">
              <ShieldCheck className="size-3.5" />
              {catalog.permissions.length} permissions · {Object.keys(catalog.grouped).length} categories
            </Badge>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* People list */}
        <Card className="gap-0 self-start overflow-hidden p-0 lg:sticky lg:top-4">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people…"
                className="h-9 pl-9"
                aria-label="Search people"
              />
            </div>
          </div>

          {isError ? (
            <div className="p-3">
              <ErrorState error={error} onRetry={() => refetch()} />
            </div>
          ) : isLoading ? (
            <TableSkeleton rows={6} />
          ) : users.length === 0 ? (
            <div className="p-3">
              <EmptyState icon={Users} title="No people found" description="Try a different search." />
            </div>
          ) : (
            <ul className="thin-scrollbar max-h-[70vh] overflow-y-auto">
              {users.map((u) => {
                const active = u.id === activeId;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(u.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-0",
                        active ? "bg-primary-soft/60" : "hover:bg-muted/50",
                      )}
                    >
                      <UserAvatar name={u.name ?? u.email} imageUrl={u.avatarUrl} size="size-9" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{u.name ?? "Unnamed"}</span>
                        <span className="text-muted-foreground block truncate text-xs">{u.email}</span>
                      </span>
                      <RoleBadge role={u.role} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Editor */}
        <div className="min-w-0">
          {activeId ? (
            <PermissionEditor userId={activeId} />
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="Select someone to begin"
              description="Choose a person on the left to review and adjust what they can do."
            />
          )}
        </div>
      </div>
    </div>
  );
}
