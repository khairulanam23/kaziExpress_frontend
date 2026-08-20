"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useCurrentUser } from "@/hooks/queries/use-auth";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional SSR-safe mount flag
    setHydrated(true);
  }, []);

  // Validates the persisted session against the real backend (also
  // refreshes cached user/profile data on every dashboard load).
  const { isError, isLoading } = useCurrentUser();

  React.useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  React.useEffect(() => {
    if (hydrated && isAuthenticated && isError) {
      useAuthStore.getState().logout();
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, isError, router]);

  if (!hydrated || !isAuthenticated || (isLoading && !isError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="text-primary size-6 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
