import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Decimalish } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Coerces a backend Decimal (string) or number for display formatting. */
function toNumber(value: Decimalish | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrency(value: Decimalish | null | undefined, compact = false) {
  const formatted = new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(toNumber(value));
  return `৳${formatted}`;
}

/** Money with paisa — for payroll figures where the exact amount matters. */
export function formatMoney(value: Decimalish | null | undefined) {
  return `৳${new Intl.NumberFormat("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(toNumber(value))}`;
}

export function formatNumber(value: Decimalish | null | undefined, compact = false) {
  return new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(toNumber(value));
}

/** Quantities keep up to 3 decimals (matching the Decimal(14,3) columns) but drop trailing zeros. */
export function formatQuantity(value: Decimalish | null | undefined, unit?: string | null) {
  const n = toNumber(value);
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(n);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatHours(value: Decimalish | null | undefined) {
  const n = toNumber(value);
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)}h`;
}

export function formatPercent(value: number | null | undefined, dp = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(dp)}%`;
}

export function formatDate(date?: string | Date | null) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export function formatDateTime(date?: string | Date | null) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatTime(date?: string | Date | null) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function formatMonth(year: number, month: number) {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

/** `YYYY-MM-DD` in local time — the format every backend date filter expects. */
export function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** First and last day of a given month, as `YYYY-MM-DD`. */
export function monthRange(year: number, month: number) {
  return {
    from: toDateInput(new Date(year, month - 1, 1)),
    to: toDateInput(new Date(year, month, 0)),
  };
}

/** `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">`. */
export function toDateTimeLocalInput(date?: string | Date | null) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Relative "3m ago" style stamp for notification lists. */
export function formatRelativeTime(date?: string | Date | null) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

/** Turns `total_inventory_value` / `camelCase` config keys into readable labels. */
export function humanizeKey(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
