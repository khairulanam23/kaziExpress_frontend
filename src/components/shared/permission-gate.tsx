"use client";

import * as React from "react";
import { usePermissions } from "@/hooks/use-permissions";
import type { PermissionKey } from "@/constants/permissions";

/**
 * Renders `children` only when the user holds the required permission(s).
 *
 * Purely a UX affordance — it removes controls the server would reject anyway,
 * so the interface never dangles an action that cannot succeed. It is not a
 * security boundary.
 *
 * Pass `fallback` to show something in place of the hidden content, or
 * `mode="disable"` to keep the control visible but inert (useful where the
 * absence of a button would itself be confusing).
 */
export function PermissionGate({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
  mode = "hide",
}: {
  permission?: PermissionKey | string;
  anyOf?: readonly (PermissionKey | string)[];
  allOf?: readonly (PermissionKey | string)[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: "hide" | "disable";
}) {
  const { has, hasAny, hasAll } = usePermissions();

  const allowed =
    (permission ? has(permission) : true) &&
    (anyOf ? hasAny(anyOf) : true) &&
    (allOf ? hasAll(allOf) : true);

  if (allowed) return <>{children}</>;
  if (mode === "disable") {
    return (
      <div aria-disabled="true" className="pointer-events-none opacity-50">
        {children}
      </div>
    );
  }
  return <>{fallback}</>;
}
