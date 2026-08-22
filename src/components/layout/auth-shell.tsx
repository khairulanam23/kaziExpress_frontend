import type { ReactNode } from "react";
import { LayoutDashboard } from "lucide-react";

export function AuthShell({
  children,
  eyebrow,
  title,
  subtitle,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <LayoutDashboard className="size-4.5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Kazi Express</span>
          </div>
          <p className="text-primary mb-2 text-xs font-semibold tracking-widest uppercase">{eyebrow}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
