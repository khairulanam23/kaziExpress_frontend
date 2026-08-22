"use client";

import * as React from "react";
import { useAuthStore } from "@/store/auth-store";
import type { PermissionKey } from "@/constants/permissions";

/**
 * Effective permissions for the signed-in user.
 *
 * The backend returns `user.permissions` on both `/auth/login` and `/auth/me`
 * as the already-resolved effective set (role defaults + explicit grants), so
 * the client never recomputes it — it only reads it.
 *
 * These checks decide what the UI *offers*. Authorisation itself stays on the
 * server: every guarded route re-resolves permissions per request.
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  return React.useMemo(() => {
    const isAdmin = user?.role === "ADMIN";
    const granted = new Set(user?.permissions ?? []);

    /** Administrators implicitly hold every permission, as the server does. */
    const has = (permission?: PermissionKey | string | null): boolean => {
      if (!permission) return true;
      if (isAdmin) return true;
      return granted.has(permission);
    };

    const hasAny = (permissions: readonly (PermissionKey | string)[]): boolean =>
      isAdmin || permissions.some((p) => granted.has(p));

    const hasAll = (permissions: readonly (PermissionKey | string)[]): boolean =>
      isAdmin || permissions.every((p) => granted.has(p));

    return {
      permissions: user?.permissions ?? [],
      isAdmin,
      isAuthenticated: !!user,
      has,
      hasAny,
      hasAll,
    };
  }, [user]);
}
