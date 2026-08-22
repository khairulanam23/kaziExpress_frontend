"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getApiErrorKind } from "@/lib/api-client";

/**
 * Retry policy.
 *
 * Permission, authentication and not-found failures are terminal — the same
 * request will fail identically however many times it is repeated. Retrying
 * them only produced a burst of duplicate 403s and kept the network busy long
 * after the user had been redirected away, so those are failed immediately and
 * only genuinely transient faults (network drops, 5xx) are retried.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const kind = getApiErrorKind(error);
  if (kind === "auth" || kind === "forbidden" || kind === "notFound" || kind === "validation") return false;
  return failureCount < 2;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Socket events invalidate the cache, so a long stale time is safe.
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: shouldRetry,
          },
          mutations: {
            // A failed write is never retried automatically: the user should
            // decide whether to try again, not have it happen behind them.
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
