"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Coins, Info, Percent, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { StatCard } from "@/components/shared/stat-card";
import { PermissionGate } from "@/components/shared/permission-gate";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PERMISSIONS } from "@/constants/permissions";
import { useProfitReport } from "@/hooks/queries/use-sales";
import type { DateRange } from "@/components/shared/period-picker";
import { formatCurrency, formatNumber, formatQuantity } from "@/lib/utils";

const RevenueBreakdownChart = dynamic(
  () => import("./dashboard-charts").then((m) => m.RevenueBreakdownChart),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full rounded-2xl" /> },
);

/**
 * Sales and gross profit on the dashboard.
 *
 * Every figure comes from the values frozen when each sale was recorded — the
 * selling price and the batch's real cost at that moment — so re-pricing a
 * product today cannot rewrite what last month earned. That is also why this
 * reads from the profit endpoint rather than recomputing anything here.
 *
 * Gated on `REPORT_PROFIT`. The query hook is already disabled without that
 * permission, so gating the section too is what stops an empty frame appearing
 * for someone who may never fill it.
 */
export function SalesProfitSection({ range }: { range?: DateRange }) {
  const { data, isLoading, isError, error, refetch } = useProfitReport(range);

  const summary = data?.summary;
  const provisional = summary?.salesWithProvisionalCost ?? 0;

  // Ranked here rather than in the chart: the top earners are a different
  // question from the trend, and the API returns the full list.
  const topProducts = React.useMemo(
    () => [...(data?.byProduct ?? [])].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 5),
    [data],
  );
  const widest = topProducts.length ? Math.max(...topProducts.map((p) => Math.abs(p.grossProfit))) : 0;

  const margin = summary?.marginPercent;
  const marginTone = margin === null || margin === undefined ? "primary" : margin < 0 ? "destructive" : margin < 15 ? "warning" : "success";

  return (
    <PermissionGate permission={PERMISSIONS.REPORT_PROFIT}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Sales &amp; profit</h2>
            <p className="text-muted-foreground text-sm">
              What was sold in this period, what it cost, and what it earned.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/reports">
              Full report <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : isLoading && !data ? (
          <CardGridSkeleton count={4} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Revenue"
                value={formatCurrency(summary?.revenue ?? 0, true)}
                icon={Receipt}
                accent="primary"
                helper={`${formatNumber(summary?.sales ?? 0)} sale(s) · ${formatQuantity(summary?.unitsSold ?? 0)} units`}
              />
              <StatCard
                label="Cost of goods sold"
                value={formatCurrency(summary?.cogs ?? 0, true)}
                icon={Coins}
                accent="warning"
                helper="Material and labour, frozen at the time of sale"
              />
              <StatCard
                label="Gross profit"
                value={formatCurrency(summary?.grossProfit ?? 0, true)}
                icon={(summary?.grossProfit ?? 0) < 0 ? TrendingDown : TrendingUp}
                accent={(summary?.grossProfit ?? 0) < 0 ? "destructive" : "success"}
                /*
                  Gross profit is earned on sales; a write-off destroys stock and
                  is a separate loss. Showing only the former would let a period
                  that wrote off more than it earned still read as a good one, so
                  what is actually left says so on the same card.
                */
                helper={
                  (summary?.writeOffs ?? 0) > 0
                    ? `${formatCurrency(summary?.netOfWriteOffs ?? 0, true)} after ${formatNumber(summary?.writeOffs ?? 0)} write-off(s)`
                    : "Revenue less cost of goods sold"
                }
              />
              <StatCard
                label="Gross margin"
                value={margin === null || margin === undefined ? "—" : `${margin.toFixed(1)}%`}
                icon={Percent}
                accent={marginTone}
                helper={
                  (summary?.writeOffs ?? 0) > 0
                    ? `Write-offs cost a further ${formatCurrency(summary?.writeOffCost ?? 0, true)}`
                    : "Share of revenue kept as profit"
                }
              />
            </div>

            {/*
              A batch whose production run has not finished carries material cost
              only, so its margin is not settled yet. Saying so is the difference
              between a figure and a figure you can act on.
            */}
            {provisional > 0 && (
              <div className="border-warning/30 bg-warning-soft/30 text-muted-foreground flex items-start gap-2 rounded-xl border px-3 py-2 text-xs">
                <Info className="text-warning mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  {formatNumber(provisional)} sale(s) came from a batch still in production, so labour is not
                  included in their cost yet — their margin will settle once the run completes.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <RevenueBreakdownChart byMonth={data?.byMonth} isLoading={isLoading} className="xl:col-span-2" />

              <ChartCard title="Top earners" description="Products ranked by gross profit in this period">
                {topProducts.length === 0 ? (
                  <EmptyState
                    icon={Coins}
                    title="Nothing sold yet"
                    description="Record a sale from the Finished goods page and it will appear here."
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {topProducts.map((p) => {
                      const loss = p.grossProfit < 0;
                      return (
                        <div key={p.productId ?? p.name} className="flex flex-col gap-1.5">
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="truncate" title={p.name}>
                              {p.name}
                            </span>
                            <span className={`tabular shrink-0 font-semibold ${loss ? "text-destructive" : ""}`}>
                              {formatCurrency(p.grossProfit, true)}
                            </span>
                          </div>
                          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                            <div
                              className={`h-full rounded-full ${loss ? "bg-destructive" : "bg-chart-1"}`}
                              style={{ width: `${widest > 0 ? (Math.abs(p.grossProfit) / widest) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="text-muted-foreground flex items-center justify-between text-xs">
                            <span>
                              {formatQuantity(p.unitsSold)} {p.unitsSold === 1 ? "unit" : "units"}
                            </span>
                            <Badge variant={loss ? "destructive" : p.marginPercent !== null && p.marginPercent < 15 ? "warning" : "success"}>
                              {p.marginPercent === null ? "—" : `${p.marginPercent.toFixed(1)}%`}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </PermissionGate>
  );
}
