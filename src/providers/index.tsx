"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { QueryProvider } from "./query-provider";
import { SocketProvider } from "./socket-provider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-card !text-card-foreground !border !border-border !rounded-xl !shadow-lg",
              title: "!font-medium",
              description: "!text-muted-foreground",
            },
          }}
        />
      </QueryProvider>
    </ThemeProvider>
  );
}
