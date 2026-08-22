"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  History,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { ICON_MAP } from "@/constants/icon-map";
import { PERMISSION_CATEGORY_META, PRESET_META, SENSITIVE_PERMISSIONS } from "@/constants/permissions";
import { useEmployeePermissions, usePermissionCatalog, useReplacePermissions } from "@/hooks/queries/use-permissions-api";
import { useAuthStore } from "@/store/auth-store";
import { getApiErrorMessage } from "@/lib/api-client";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Permission } from "@/types";

/** One collapsible category of permissions with a per-category toggle-all. */
function CategorySection({
  label,
  permissions,
  granted,
  defaults,
  disabled,
  onToggle,
  onToggleAll,
  search,
}: {
  label: string;
  permissions: Permission[];
  granted: Set<string>;
  defaults: Set<string>;
  disabled: boolean;
  onToggle: (key: string, next: boolean) => void;
  onToggleAll: (keys: string[], next: boolean) => void;
  search: string;
}) {
  const [open, setOpen] = React.useState(true);

  const visible = React.useMemo(() => {
    if (!search.trim()) return permissions;
    const q = search.trim().toLowerCase();
    return permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
  }, [permissions, search]);

  if (!visible.length) return null;

  const meta = PERMISSION_CATEGORY_META[label];
  const Icon = ICON_MAP[meta?.icon ?? "ShieldCheck"] ?? ShieldCheck;

  // Defaults are implicit and can't be revoked, so "all on" ignores them.
  const togglable = visible.filter((p) => !defaults.has(p.key));
  const activeCount = visible.filter((p) => granted.has(p.key) || defaults.has(p.key)).length;
  const allOn = togglable.length > 0 && togglable.every((p) => granted.has(p.key));

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span className="bg-primary-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
            <Icon className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{label}</span>
            <span className="text-muted-foreground block truncate text-xs">{meta?.blurb}</span>
          </span>
          <Badge variant={activeCount ? "default" : "muted"}>
            {activeCount}/{visible.length}
          </Badge>
          <ChevronDown className={cn("text-muted-foreground size-4 transition-transform", !open && "-rotate-90")} />
        </button>

        {togglable.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs"
            disabled={disabled}
            onClick={() => onToggleAll(togglable.map((p) => p.key), !allOn)}
          >
            {allOn ? "Clear all" : "Select all"}
          </Button>
        )}
      </div>

      {open && (
        <div className="flex flex-col">
          {visible.map((p) => {
            const isDefault = defaults.has(p.key);
            const isOn = isDefault || granted.has(p.key);
            const isSensitive = SENSITIVE_PERMISSIONS.includes(p.key);

            return (
              <label
                key={p.key}
                htmlFor={`perm-${p.key}`}
                className={cn(
                  "flex items-start gap-3 border-b border-border/60 px-4 py-3 last:border-0",
                  !isDefault && !disabled && "hover:bg-muted/40 cursor-pointer",
                )}
              >
                <Switch
                  id={`perm-${p.key}`}
                  checked={isOn}
                  disabled={disabled || isDefault}
                  onCheckedChange={(next) => onToggle(p.key, next)}
                  aria-describedby={`perm-desc-${p.key}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">{p.name}</span>
                    {isDefault && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="muted">
                            <Lock />
                            Built in
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Every employee has this; it can&apos;t be revoked.</TooltipContent>
                      </Tooltip>
                    )}
                    {isSensitive && !isDefault && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="warning">
                            <AlertTriangle />
                            Sensitive
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Grants wide-reaching or financial access.</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <p id={`perm-desc-${p.key}`} className="text-muted-foreground text-xs">
                    {p.description ?? p.key}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/**
 * Permission editor for one employee.
 *
 * Edits the *explicit* grant list only; the baseline every employee already
 * holds is shown as locked-on so the effective result is never a mystery.
 */
export function PermissionEditor({ userId }: { userId: string }) {
  const currentUser = useAuthStore((s) => s.user);
  const { data: catalog, isLoading: catalogLoading, isError: catalogError, error: catErr, refetch: refetchCatalog } =
    usePermissionCatalog();
  const { data: employee, isLoading, isError, error, refetch } = useEmployeePermissions(userId);
  const replace = useReplacePermissions();

  const [draft, setDraft] = React.useState<Set<string> | null>(null);
  const [search, setSearch] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Re-seed the working copy whenever a different employee's data arrives.
  const [seeded, setSeeded] = React.useState<string | null>(null);
  const serverKeys = React.useMemo(
    () => new Set(employee?.explicitPermissionKeys ?? []),
    [employee],
  );
  if (employee && seeded !== employee.user.id) {
    setSeeded(employee.user.id);
    setDraft(new Set(serverKeys));
  }

  const granted = draft ?? serverKeys;
  const defaults = React.useMemo(() => new Set(employee?.defaultPermissions ?? []), [employee]);

  const dirty = React.useMemo(() => {
    if (!draft) return false;
    if (draft.size !== serverKeys.size) return true;
    for (const k of draft) if (!serverKeys.has(k)) return true;
    return false;
  }, [draft, serverKeys]);

  const added = React.useMemo(() => [...granted].filter((k) => !serverKeys.has(k)), [granted, serverKeys]);
  const removed = React.useMemo(() => [...serverKeys].filter((k) => !granted.has(k)), [granted, serverKeys]);
  const sensitiveAdded = added.filter((k) => SENSITIVE_PERMISSIONS.includes(k));

  const isSelf = currentUser?.id === userId;
  const isTargetAdmin = employee?.user.role === "ADMIN";
  // Editing your own grants would let you widen your own reach; the server
  // rejects it too, but the control is disabled so the intent is obvious.
  const locked = isSelf || isTargetAdmin;

  const toggle = (key: string, next: boolean) =>
    setDraft((prev) => {
      const copy = new Set(prev ?? serverKeys);
      if (next) copy.add(key);
      else copy.delete(key);
      return copy;
    });

  const toggleAll = (keys: string[], next: boolean) =>
    setDraft((prev) => {
      const copy = new Set(prev ?? serverKeys);
      for (const k of keys) {
        if (next) copy.add(k);
        else copy.delete(k);
      }
      return copy;
    });

  const applyPreset = (presetName: string) => {
    const keys = catalog?.presets[presetName] ?? [];
    // Presets include the implicit baseline; store only the explicit extras.
    setDraft(new Set(keys.filter((k) => !defaults.has(k))));
    toast.success(`${PRESET_META[presetName]?.label ?? presetName} applied`, {
      description: "Review the changes, then save.",
    });
  };

  const handleSave = () => {
    replace.mutate(
      { userId, permissions: [...granted] },
      {
        onSuccess: () => {
          toast.success("Permissions updated", {
            description: `${employee?.user.name ?? "This employee"} now has ${granted.size + defaults.size} permissions.`,
          });
          setConfirmOpen(false);
          setSeeded(null);
        },
        onError: (err) => toast.error("Couldn't update permissions", { description: getApiErrorMessage(err) }),
      },
    );
  };

  if (catalogError) return <ErrorState error={catErr} onRetry={() => refetchCatalog()} />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  if (isLoading || catalogLoading || !catalog || !employee) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const effectiveCount = granted.size + defaults.size;
  const totalCount = catalog.permissions.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Who is being edited, and where they stand */}
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <UserAvatar name={employee.user.name ?? employee.user.email} size="size-12" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{employee.user.name ?? "Unnamed"}</p>
            <p className="text-muted-foreground truncate text-sm">{employee.user.email}</p>
          </div>
        </div>

        <div className="flex min-w-52 flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Effective access</span>
            <span className="tabular font-semibold">
              {effectiveCount} of {totalCount}
            </span>
          </div>
          <Progress value={(effectiveCount / totalCount) * 100} />
        </div>
      </Card>

      {locked && (
        <div className="border-warning/30 bg-warning-soft/40 flex items-start gap-2 rounded-xl border p-3">
          <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
          <p className="text-xs">
            {isSelf
              ? "You can't change your own permissions. Ask another administrator to make this change."
              : "Administrators already hold every permission, so there is nothing to grant here."}
          </p>
        </div>
      )}

      {/* Presets */}
      {!locked && (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" />
            <p className="text-sm font-semibold">Start from a role</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Object.keys(catalog.presets).map((name) => {
              const meta = PRESET_META[name];
              const Icon = ICON_MAP[meta?.icon ?? "User"] ?? ShieldCheck;
              const count = catalog.presets[name].length;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => applyPreset(name)}
                  className="border-border hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-ring flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{meta?.label ?? name}</span>
                    <span className="text-muted-foreground block text-xs">{meta?.blurb}</span>
                    <span className="text-muted-foreground mt-0.5 block text-[11px]">{count} permissions</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Search + save bar */}
      <div className="bg-background sticky top-0 z-10 flex flex-wrap items-center gap-2 py-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search permissions…"
          className="h-9 max-w-xs flex-1"
          aria-label="Search permissions"
        />
        {dirty && (
          <Badge variant="warning">
            {added.length > 0 && `+${added.length}`}
            {added.length > 0 && removed.length > 0 && " / "}
            {removed.length > 0 && `−${removed.length}`}
          </Badge>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDraft(new Set(serverKeys))}
            disabled={!dirty || replace.isPending}
          >
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={!dirty || locked || replace.isPending}>
            {replace.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-3">
        {Object.entries(catalog.grouped).map(([label, permissions]) => (
          <CategorySection
            key={label}
            label={label}
            permissions={permissions}
            granted={granted}
            defaults={defaults}
            disabled={locked || replace.isPending}
            onToggle={toggle}
            onToggleAll={toggleAll}
            search={search}
          />
        ))}
      </div>

      {/* Audit trail */}
      {employee.auditLogs.length > 0 && (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <History className="text-muted-foreground size-4" />
            <p className="text-sm font-semibold">Recent permission changes</p>
          </div>
          <ol className="flex flex-col gap-2.5">
            {employee.auditLogs.slice(0, 8).map((log) => (
              <li key={log.id} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    /grant|add/i.test(log.action) ? "bg-success" : "bg-destructive",
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 text-xs">
                  <p>
                    <span className="font-medium">{log.performedBy?.name ?? "System"}</span>{" "}
                    <span className="text-muted-foreground">
                      {log.action.replace(/_/g, " ").toLowerCase()}
                      {log.permissionKey ? ` — ${log.permissionKey}` : ""}
                    </span>
                  </p>
                  <p className="text-muted-foreground">{formatRelativeTime(log.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Confirmation, with the exact diff spelled out */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply permission changes?</DialogTitle>
            <DialogDescription>
              {employee.user.name ?? employee.user.email} will have {effectiveCount} of {totalCount} permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {sensitiveAdded.length > 0 && (
              <div className="border-warning/30 bg-warning-soft/40 flex items-start gap-2 rounded-xl border p-3">
                <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
                <div className="text-xs">
                  <p className="font-medium">This grants wide-reaching access</p>
                  <p className="text-muted-foreground mt-0.5">{sensitiveAdded.join(", ")}</p>
                </div>
              </div>
            )}

            {added.length > 0 && (
              <div>
                <p className="text-success mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                  <Check className="size-3.5" />
                  Granting {added.length}
                </p>
                <div className="flex flex-wrap gap-1">
                  {added.map((k) => (
                    <Badge key={k} variant="success">{k}</Badge>
                  ))}
                </div>
              </div>
            )}

            {removed.length > 0 && (
              <div>
                <p className="text-destructive mb-1.5 text-xs font-semibold">Revoking {removed.length}</p>
                <div className="flex flex-wrap gap-1">
                  {removed.map((k) => (
                    <Badge key={k} variant="destructive">{k}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={replace.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={replace.isPending}>
              {replace.isPending && <Loader2 className="size-4 animate-spin" />}
              Apply changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { EmptyState };
