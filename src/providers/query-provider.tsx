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
            // Socket events do the moment-to-moment invalidation, so data can
            // sit for a while without refetching.
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            // But the socket is not a guarantee: events raised while the tab
            // was backgrounded or the connection was down are never replayed.
            // Refetching stale queries on focus and on reconnect is the floor
            // under that — without it a screen left open can stay wrong
            // indefinitely.
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
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
