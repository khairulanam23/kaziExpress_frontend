"use client";

import * as React from "react";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTH_NAMES, cn, toDateInput } from "@/lib/utils";

export interface Period {
  year: number;
  month: number;
}

export function currentPeriod(): Period {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function shiftPeriod(period: Period, delta: number): Period {
  const d = new Date(period.year, period.month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Month + year selector with prev/next stepping — used by payroll and reports. */
export function MonthPicker({
  value,
  onChange,
  className,
  minYear = new Date().getFullYear() - 5,
  maxYear = new Date().getFullYear() + 1,
}: {
  value: Period;
  onChange: (period: Period) => void;
  className?: string;
  minYear?: number;
  maxYear?: number;
}) {
  const years = React.useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).reverse(),
    [minYear, maxYear],
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(shiftPeriod(value, -1))}
        aria-label="Previous month"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Select value={String(value.month)} onValueChange={(m) => onChange({ ...value, month: Number(m) })}>
        <SelectTrigger className="w-32" aria-label="Month">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, i) => (
            <SelectItem key={name} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(value.year)} onValueChange={(y) => onChange({ ...value, year: Number(y) })}>
        <SelectTrigger className="w-24" aria-label="Year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon-sm" onClick={() => onChange(shiftPeriod(value, 1))} aria-label="Next month">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

export interface DateRange {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
}

export function currentMonthRange(): DateRange {
  const now = new Date();
  return {
    from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

/**
 * A quarter back. Production runs and purchases are sparse compared with
 * attendance, so a report defaulting to the current month often opens empty on
 * a system that has plenty to show — this matches the API's own 90-day default.
 */
export function lastQuarterRange(): DateRange {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 90);
  return { from: toDateInput(start), to: toDateInput(now) };
}

const RANGE_PRESETS: { label: string; build: () => DateRange }[] = [
  {
    label: "This month",
    build: currentMonthRange,
  },
  {
    label: "Last month",
    build: () => {
      const now = new Date();
      return {
        from: toDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
  {
    label: "Last 7 days",
    build: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: toDateInput(from), to: toDateInput(now) };
    },
  },
  {
    label: "Last 30 days",
    build: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: toDateInput(from), to: toDateInput(now) };
    },
  },
  {
    label: "This year",
    build: () => {
      const now = new Date();
      return { from: toDateInput(new Date(now.getFullYear(), 0, 1)), to: toDateInput(now) };
    },
  },
];

/**
 * From/to date inputs plus quick presets. Emits only valid ranges — the
 * backend rejects `from > to`, so the picker refuses to produce one.
 */
export function DateRangePicker({
  value,
  onChange,
  className,
  showPresets = true,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  showPresets?: boolean;
}) {
  const invalid = !!value.from && !!value.to && value.from > value.to;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-muted-foreground text-xs">From</Label>
          <Input
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="h-9 w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-muted-foreground text-xs">To</Label>
          <Input
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="h-9 w-40"
          />
        </div>

        {showPresets && (
          <Select onValueChange={(label) => {
            const preset = RANGE_PRESETS.find((p) => p.label === label);
            if (preset) onChange(preset.build());
          }}>
            <SelectTrigger className="h-9 w-40">
              <CalendarRange className="size-4" />
              <SelectValue placeholder="Quick range" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_PRESETS.map((p) => (
                <SelectItem key={p.label} value={p.label}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {invalid && <p className="text-destructive text-xs">The start date must be on or before the end date.</p>}
    </div>
  );
}
