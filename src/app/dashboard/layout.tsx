"use client";

import type { ReactNode } from "react";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/layout/auth-guard";
import { DesktopSidebar, MobileSidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { routeRuleFor } from "@/constants/nav";
import { usePermissions } from "@/hooks/use-permissions";
import { LoadingState } from "@/components/shared/states";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, has, hasAny, isAuthenticated } = usePermissions();

  const rule = routeRuleFor(pathname);

  const allowed =
    !rule ||
    ((!rule.adminOnly || isAdmin) &&
      (!rule.anyOf || hasAny(rule.anyOf)) &&
      has(rule.permission));

  // Until the session is known, the verdict is unknowable — render neither the
  // page nor a redirect. Mounting the page first would fire its queries and
  // produce a burst of 403s the user never sees the result of.
  const verdictReady = isAuthenticated;
  const forbidden = verdictReady && !allowed;

  React.useEffect(() => {
    if (forbidden) router.replace("/dashboard");
  }, [forbidden, router]);

  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full bg-background">
        <DesktopSidebar />
        <MobileSidebar />
        <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {!verdictReady ? <LoadingState label="Loading…" /> : forbidden ? null : children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
