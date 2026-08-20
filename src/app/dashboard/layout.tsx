"use client";

import type { ReactNode } from "react";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/layout/auth-guard";
import { DesktopSidebar, MobileSidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { isAdminOnlyRoute } from "@/constants/nav";
import { useAuthStore } from "@/store/auth-store";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const router = useRouter();

  const forbidden = !!user && user.role !== "ADMIN" && isAdminOnlyRoute(pathname);

  // Client-side redirect is a UX nicety; the API rejects these calls with 403
  // for non-admins regardless of how the route was reached.
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
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{forbidden ? null : children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
