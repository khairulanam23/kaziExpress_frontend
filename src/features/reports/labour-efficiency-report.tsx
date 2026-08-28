"use client";

import * as React from "react";
import { Gauge, Info } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { DateRangePicker, lastQuarterRange, type DateRange } from "@/components/shared/period-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLabourEfficiencyReport } from "@/hooks/queries/use-analytics";
import { formatMoney, formatNumber, formatQuantity } from "@/lib/utils";
import { ReportToolbar, SummaryTile } from "./report-shell";

/**
 * Labour efficiency.
 *
 * Output per attributed hour, per person. The attribution is an estimate — the
 * server says so in `basis` and that is shown, because ranking people by a
 * derived number without stating how it was derived would be misleading.
 */

/** Throughput drawn relative to the best performer, so the spread is visible. */
function ThroughputBar({ value, best }: { value: number | null; best: number }) {
  if (value === null) return <span className="text-muted-foreground text-xs">No hours attributed</span>;
  const pct = best > 0 ? (value / best) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-2 w-20 overflow-hidden rounded-full sm:w-28">
        <div className="bg-chart-1 h-full rounded-full" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <span className="tabular text-xs">{value.toFixed(2)}/h</span>
    </div>
  );
}

/** On-time rate stated as a fraction and a word, never as a colour alone. */
function OnTime({ rate, onTime, late }: { rate: number | null; onTime: number; late: number }) {
  if (rate === null) return <span className="text-muted-foreground text-xs">No deadlines set</span>;
  const tone = rate >= 90 ? "text-success" : rate >= 60 ? "text-warning" : "text-destructive";
  const word = rate >= 90 ? "Reliable" : rate >= 60 ? "Mixed" : "Slipping";
  return (
    <div className="flex flex-col">
      <span className={`tabular text-sm font-medium ${tone}`}>
        {word} · {rate.toFixed(1)}%
      </span>
      <span className="text-muted-foreground text-xs">
        {onTime} on time, {late} late
      </span>
    </div>
  );
}

export function LabourEfficiencyReportView() {
  // Completed runs and deliveries are sparse; a month-wide default opens empty.
  const [range, setRange] = React.useState<DateRange>(lastQuarterRange);
  const valid = range.from <= range.to;
  const { data, isLoading, isError, error, refetch } = useLabourEfficiencyReport({
    from: valid ? range.from : undefined,
    to: valid ? range.to : undefined,
  });

  const best = React.useMemo(
    () => Math.max(0, ...(data?.employees ?? []).map((e) => e.unitsPerHour ?? 0)),
    [data],
  );

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar filters={<DateRangePicker value={range} onChange={setRange} />} />

      {isLoading && <TableSkeleton rows={6} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SummaryTile label="Tasks completed" value={formatNumber(data.summary.tasksCompleted)} tone="primary" />
            <SummaryTile label="Units produced" value={formatQuantity(data.summary.unitsProduced)} />
            <SummaryTile label="Hours attributed" value={`${formatNumber(data.summary.attributedHours)}h`} helper="Estimated" />
            <SummaryTile label="Labour cost" value={formatMoney(data.summary.labourCost)} />
            <SummaryTile
              label="Delivered on time"
              value={data.summary.onTimeRate === null ? "—" : `${data.summary.onTimeRate.toFixed(1)}%`}
              tone={data.summary.onTimeRate !== null && data.summary.onTimeRate >= 90 ? "success" : "warning"}
              helper={`${formatNumber(data.summary.tasksWithDeadline)} had a deadline`}
            />
          </div>

          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{data.basis}</span>
          </p>

          {data.employees.length === 0 ? (
            <EmptyState
              icon={Gauge}
              title="No completed work in this period"
              description="Efficiency is measured from tasks that finished — widen the date range or complete a run first."
            />
          ) : (
            <ChartCard title="By employee" description="Highest throughput first.">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Tasks</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead>Throughput</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Cost per unit</TableHead>
                      <TableHead>Deadlines</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.employees.map((row) => (
                      <TableRow key={row.employeeId}>
                        <TableCell>
                          <div className="font-medium">{row.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {row.designation ?? "—"}
                            {row.department && ` · ${row.department}`}
                          </div>
                        </TableCell>
                        <TableCell className="tabular text-right">{formatNumber(row.tasksCompleted)}</TableCell>
                        <TableCell className="tabular text-right">{formatQuantity(row.unitsProduced)}</TableCell>
                        <TableCell>
                          <ThroughputBar value={row.unitsPerHour} best={best} />
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {formatNumber(row.attributedHours)}h
                          <div className="text-muted-foreground text-xs">of {formatNumber(row.totalHoursWorked)}h worked</div>
                        </TableCell>
                        <TableCell className="tabular text-right font-semibold">
                          {row.costPerUnit === null ? "—" : formatMoney(row.costPerUnit)}
                        </TableCell>
                        <TableCell>
                          <OnTime rate={row.onTimeRate} onTime={row.onTime} late={row.late} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
