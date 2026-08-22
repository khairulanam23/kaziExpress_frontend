"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Clock, PackageX, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import type { AdminDashboardOverview } from "@/types";

type Severity = "critical" | "warning" | "info";

interface Alert {
  id: string;
  severity: Severity;
  icon: typeof AlertTriangle;
  title: string;
  detail: string;
  href: string;
  cta: string;
  permission?: string;
}

const SEVERITY: Record<Severity, { ring: string; chip: string; label: string }> = {
  critical: { ring: "border-destructive/40 bg-destructive-soft/40", chip: "text-destructive bg-destructive-soft", label: "Critical" },
  warning: { ring: "border-warning/40 bg-warning-soft/40", chip: "text-warning bg-warning-soft", label: "Needs attention" },
  info: { ring: "border-border bg-muted/40", chip: "text-muted-foreground bg-muted", label: "For review" },
};

/**
 * Things that need a human decision, surfaced above the metrics.
 *
 * Every alert is a link to the screen that resolves it, so the dashboard is a
 * starting point for work rather than a read-only summary. Alerts the user
 * lacks permission to act on are omitted — dead ends help nobody.
 */
export function AlertsPanel({ data, pendingRequests }: { data?: AdminDashboardOverview; pendingRequests?: number }) {
  const { has } = usePermissions();

  const alerts = React.useMemo<Alert[]>(() => {
    if (!data) return [];
    const out: Alert[] = [];

    if (data.inventory.outOfStockCount > 0) {
      out.push({
        id: "out-of-stock",
        severity: "critical",
        icon: PackageX,
        title: `${data.inventory.outOfStockCount} item${data.inventory.outOfStockCount === 1 ? "" : "s"} out of stock`,
        detail: "Production using these will stall until they're restocked.",
        href: "/dashboard/inventory",
        cta: "Restock",
        permission: PERMISSIONS.PRODUCT_VIEW,
      });
    }

    if (data.inventory.lowStockCount > 0) {
      out.push({
        id: "low-stock",
        severity: "warning",
        icon: AlertTriangle,
        title: `${data.inventory.lowStockCount} item${data.inventory.lowStockCount === 1 ? "" : "s"} running low`,
        detail: "Below the reorder threshold you set.",
        href: "/dashboard/inventory",
        cta: "Review",
        permission: PERMISSIONS.PRODUCT_VIEW,
      });
    }

    if (data.employees.pendingOvertimeCount > 0) {
      out.push({
        id: "overtime",
        severity: "warning",
        icon: Clock,
        title: `${data.employees.pendingOvertimeCount} overtime record${data.employees.pendingOvertimeCount === 1 ? "" : "s"} awaiting a decision`,
        detail: "Unapproved overtime isn't paid, so people are waiting on this.",
        href: "/dashboard/attendance",
        cta: "Review overtime",
        permission: PERMISSIONS.OVERTIME_DECIDE,
      });
    }

    if (pendingRequests && pendingRequests > 0) {
      out.push({
        id: "requests",
        severity: "warning",
        icon: ClipboardList,
        title: `${pendingRequests} material request${pendingRequests === 1 ? "" : "s"} pending`,
        detail: "Employees are blocked until these are approved or rejected.",
        href: "/dashboard/refills",
        cta: "Decide",
      });
    }

    if (data.payroll.currentMonthRemainingBalance > 0 && data.payroll.unpaidEmployeesCount > 0) {
      out.push({
        id: "payroll",
        severity: "info",
        icon: Wallet,
        title: `${data.payroll.unpaidEmployeesCount} employee${data.payroll.unpaidEmployeesCount === 1 ? "" : "s"} unpaid this month`,
        detail: "Outstanding salary for the current billing period.",
        href: "/dashboard/payroll",
        cta: "Open payroll",
        permission: PERMISSIONS.PAYROLL_VIEW_ALL,
      });
    }

    return out.filter((a) => has(a.permission));
  }, [data, pendingRequests, has]);

  if (!data) return null;

  if (alerts.length === 0) {
    return (
      <Card className="border-success/30 bg-success-soft/30 flex items-center gap-3 p-4">
        <span className="bg-success-soft text-success flex size-10 shrink-0 items-center justify-center rounded-xl">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Everything looks healthy</p>
          <p className="text-muted-foreground text-xs">
            No stock shortages, pending approvals or outstanding decisions right now.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Needs your attention</h2>
        <Badge variant="warning">{alerts.length}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {alerts.map((alert) => {
          const tone = SEVERITY[alert.severity];
          const Icon = alert.icon;
          return (
            <Link
              key={alert.id}
              href={alert.href}
              className={cn(
                "group focus-visible:ring-ring flex items-center gap-3 rounded-xl border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none",
                tone.ring,
              )}
            >
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone.chip)}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold">{alert.title}</p>
                  {/* Severity is stated, not implied by colour alone. */}
                  <Badge variant={alert.severity === "critical" ? "destructive" : alert.severity === "warning" ? "warning" : "muted"}>
                    {tone.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">{alert.detail}</p>
              </div>
              <span className="text-muted-foreground group-hover:text-foreground flex shrink-0 items-center gap-1 text-xs font-medium transition-colors">
                {alert.cta}
                <ArrowRight className="size-3.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
