"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { percent } from "@/lib/calc";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { AdminDashboardOverview, ProfitReport } from "@/types";

/** Fixed categorical order — slots are assigned, never cycled. */
export const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export const AXIS_PROPS = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

/** `2026-08` → `Aug 2026`, so an axis tick reads as a month rather than a key. */
function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  payload?: Record<string, unknown>;
}

/** Shared tooltip so every chart in the app reads identically. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter = (v: number) => formatNumber(v),
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border-border rounded-lg border px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="text-muted-foreground mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={`${p.name}-${i}`} className="tabular text-popover-foreground flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{formatter(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

/** Legend swatch row — identity is never carried by colour alone. */
function LegendList({ items }: { items: { label: string; color: string; value: string }[] }) {
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="text-muted-foreground flex-1 truncate">{item.label}</span>
          <span className="tabular text-foreground font-semibold">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Production mix ─────────────────────────────────────────────────────────
export function ProductionMixChart({
  production,
  isLoading,
  className,
}: {
  production?: AdminDashboardOverview["production"];
  isLoading?: boolean;
  className?: string;
}) {
  const data = React.useMemo(
    () => [
      { name: "Pending", value: production?.pendingTasks ?? 0 },
      { name: "Accepted", value: production?.acceptedTasks ?? 0 },
      { name: "In progress", value: production?.inProgressTasks ?? 0 },
      { name: "Partial", value: production?.partiallyCompletedTasks ?? 0 },
      { name: "Completed", value: production?.completedTasks ?? 0 },
      { name: "Cancelled", value: production?.cancelledTasks ?? 0 },
    ],
    [production],
  );

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard title="Production tasks by stage" description="Every task in the system, grouped by workflow stage" className={className}>
      {isLoading && !production ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : total === 0 ? (
        <EmptyState title="No production tasks yet" description="Create a task to start tracking production." />
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="22%">
                <XAxis dataKey="name" {...AXIS_PROPS} interval={0} angle={-18} textAnchor="end" height={52} />
                <YAxis {...AXIS_PROPS} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {data.map((entry, i) => (
                    <Cell key={entry.name} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Table view keeps every value legible regardless of colour perception. */}
          <details className="mt-3">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">View as table</summary>
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.name}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell className="tabular text-right">{formatNumber(d.value)}</TableCell>
                    <TableCell className="tabular text-right">{formatPercent(percent(d.value, total))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>
        </>
      )}
    </ChartCard>
  );
}

// ── Inventory health ───────────────────────────────────────────────────────
export function InventoryHealthChart({
  inventory,
  isLoading,
  className,
}: {
  inventory?: AdminDashboardOverview["inventory"];
  isLoading?: boolean;
  className?: string;
}) {
  const healthy = Math.max(
    0,
    (inventory?.totalActiveItems ?? 0) - (inventory?.lowStockCount ?? 0) - (inventory?.outOfStockCount ?? 0),
  );

  const data = React.useMemo(
    () => [
      { name: "Well stocked", value: healthy, color: "var(--success)" },
      { name: "Low stock", value: inventory?.lowStockCount ?? 0, color: "var(--warning)" },
      { name: "Out of stock", value: inventory?.outOfStockCount ?? 0, color: "var(--destructive)" },
    ],
    [healthy, inventory],
  );

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard title="Inventory health" description="Active items by stock status" className={className}>
      {isLoading && !inventory ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : total === 0 ? (
        <EmptyState title="No active items" description="Add products or components to see stock health." />
      ) : (
        <>
          <div className="relative h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="tabular text-2xl font-bold">{formatNumber(total)}</span>
              <span className="text-muted-foreground text-xs">active items</span>
            </div>
          </div>
          {/* Status colours ship with a written label, never colour alone. */}
          <LegendList
            items={data.map((d) => ({
              label: d.name,
              color: d.color,
              value: `${formatNumber(d.value)} · ${formatPercent(percent(d.value, total))}`,
            }))}
          />
        </>
      )}
    </ChartCard>
  );
}

// ── Payroll progress ───────────────────────────────────────────────────────
export function PayrollProgressChart({
  payroll,
  isLoading,
  className,
}: {
  payroll?: AdminDashboardOverview["payroll"];
  isLoading?: boolean;
  className?: string;
}) {
  const earned = payroll?.currentMonthTotalEarnings ?? 0;
  const paid = payroll?.currentMonthPaidAmount ?? 0;
  const settled = percent(paid, earned);

  return (
    <ChartCard title="Payroll settled" description="Paid against total earned this billing month" className={className}>
      {isLoading && !payroll ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : earned === 0 ? (
        <EmptyState title="No payroll yet" description="Earnings appear once employees log attendance." />
      ) : (
        <>
          <div className="relative h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={[{ name: "Settled", value: settled, fill: "var(--chart-1)" }]}
                innerRadius="70%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "var(--muted)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="tabular text-3xl font-bold">{formatPercent(settled)}</span>
              <span className="text-muted-foreground text-xs">of payroll paid</span>
            </div>
          </div>
          <LegendList
            items={[
              { label: "Total earned", color: "var(--muted-foreground)", value: formatCurrency(earned) },
              { label: "Paid so far", color: "var(--chart-1)", value: formatCurrency(paid) },
              {
                label: "Remaining balance",
                color: "var(--destructive)",
                value: formatCurrency(payroll?.currentMonthRemainingBalance ?? 0),
              },
            ]}
          />
        </>
      )}
    </ChartCard>
  );
}

export { Legend };

/**
 * Where revenue went, month by month.
 *
 * Revenue is not plotted as its own series: it *is* the bar. Cost of goods and
 * gross profit stack to it, so the height reads as revenue and the split reads
 * as margin — one scale, no second axis, and no third series repeating a total
 * the eye can already see.
 *
 * A loss month draws its profit segment below the baseline rather than being
 * clamped to zero, because a month that lost money should not look like a month
 * that merely earned nothing.
 */
export function RevenueBreakdownChart({
  byMonth,
  isLoading,
  className,
}: {
  byMonth?: ProfitReport["byMonth"];
  isLoading?: boolean;
  className?: string;
}) {
  const data = React.useMemo(
    () =>
      (byMonth ?? []).map((m) => ({
        name: monthLabel(m.month),
        cogs: m.cogs,
        grossProfit: m.grossProfit,
        revenue: m.revenue,
        marginPercent: m.marginPercent,
      })),
    [byMonth],
  );

  return (
    <ChartCard
      title="Revenue and gross profit"
      description="Each bar is that month's revenue, split into what the goods cost and what was earned"
      className={className}
    >
      {isLoading && !byMonth ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : data.length === 0 ? (
        <EmptyState title="No sales in this period" description="Record a sale from Finished goods and it will appear here." />
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="26%">
                <XAxis dataKey="name" {...AXIS_PROPS} interval="preserveStartEnd" />
                <YAxis {...AXIS_PROPS} tickFormatter={(v: number) => formatCurrency(v, true)} width={64} />
                <Tooltip
                  content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
                />
                {/* The card colour is drawn between the segments, so the stack
                    reads as two parts rather than one gradient. */}
                <Bar
                  dataKey="cogs"
                  name="Cost of goods"
                  stackId="revenue"
                  fill={SERIES_COLORS[2]}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={52}
                />
                <Bar
                  dataKey="grossProfit"
                  name="Gross profit"
                  stackId="revenue"
                  fill={SERIES_COLORS[0]}
                  stroke="var(--card)"
                  strokeWidth={2}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={52}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Table view keeps every value legible regardless of colour perception. */}
          <details className="mt-3">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">View as table</summary>
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Gross profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.name}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell className="tabular text-right">{formatCurrency(d.revenue)}</TableCell>
                    <TableCell className="tabular text-right">{formatCurrency(d.cogs)}</TableCell>
                    <TableCell className="tabular text-right">{formatCurrency(d.grossProfit)}</TableCell>
                    <TableCell className="tabular text-right">
                      {d.marginPercent === null ? "—" : `${d.marginPercent.toFixed(1)}%`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>
        </>
      )}
    </ChartCard>
  );
}
