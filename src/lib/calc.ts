/**
 * Display-only calculation helpers.
 *
 * These mirror the arithmetic the backend already performs so the UI can show
 * live previews, running totals and inline validation without a round-trip.
 * They are NEVER the source of truth: any value that is persisted, paid, moved
 * or reserved is recomputed and re-validated server-side, and submissions send
 * only the raw user inputs the API asks for — never a locally derived figure.
 */

import type {
  Attendance,
  StockMovementType,
  BOMTreeNode,
  Decimalish,
  PaymentStatus,
  Product,
  Task,
} from "@/types";

// ---------------------------------------------------------------------------
// Decimal coercion — Prisma serialises Decimal columns as strings.
// ---------------------------------------------------------------------------

/** Safely turns a backend `Decimal` (string) or number into a JS number. */
export function num(value: Decimalish | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Rounds to `dp` decimal places, avoiding float dust like 0.1+0.2. */
export function round(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Percentage of `part` out of `total`, clamped to [0, 100]; 0 when total is 0. */
export function percent(part: number, total: number, dp = 1): number {
  if (!total) return 0;
  return round(Math.min(100, Math.max(0, (part / total) * 100)), dp);
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

/**
 * Stock a batch can still be committed to = remaining − reserved. Nested batch
 * payloads (e.g. on a task allocation) omit `reservedQuantity`, which coerces
 * to 0 — the same figure the server uses when nothing is held back.
 */
export interface BatchQuantities {
  remainingQuantity: Decimalish;
  reservedQuantity?: Decimalish | null;
}

export function batchAvailable(batch: BatchQuantities): number {
  return round(num(batch.remainingQuantity) - num(batch.reservedQuantity), 3);
}

/** Total unreserved quantity across a set of batches. */
export function totalAvailable(batches: BatchQuantities[]): number {
  return round(batches.reduce((sum, b) => sum + batchAvailable(b), 0), 3);
}

/** Total quantity currently held back for accepted tasks. */
export function totalReserved(batches: { reservedQuantity?: Decimalish | null }[]): number {
  return round(batches.reduce((sum, b) => sum + num(b.reservedQuantity), 0), 3);
}

/** Valuation of a single line = stock × unit price (matches the backend report). */
export function lineValue(product: Pick<Product, "currentStock" | "unitPrice">): number {
  return round(num(product.currentStock) * num(product.unitPrice));
}

/** Inventory valuation across a product list — the same sum the backend reports. */
export function inventoryValue(products: Pick<Product, "currentStock" | "unitPrice">[]): number {
  return round(products.reduce((sum, p) => sum + lineValue(p), 0));
}

/**
 * Whether a movement type adds to, removes from, or merely reserves stock.
 *
 * The backend is not consistent about the sign it stores: CONSUMPTION and
 * DAMAGE persist negative quantities, while ADJUSTMENT and WRITE_OFF both
 * persist `Math.abs(diff)` and rely on the *type* to convey direction. Reading
 * the raw sign therefore renders a write-off as an increase, so direction is
 * taken from the type and the magnitude from the absolute quantity.
 */
const MOVEMENT_DIRECTION: Record<StockMovementType, -1 | 0 | 1> = {
  PURCHASE: 1,
  ADJUSTMENT: 1,
  RETURN: 1,
  ASSEMBLY: 1,
  REFILL: 1,
  CONSUMPTION: -1,
  WRITE_OFF: -1,
  DAMAGE: -1,
  // Reservations move stock between "available" and "reserved" — the on-hand
  // total is unchanged, so they are rendered without a +/− sign.
  TASK_RESERVATION: 0,
  TASK_RELEASE: 0,
};

export function movementDirection(type: StockMovementType): -1 | 0 | 1 {
  return MOVEMENT_DIRECTION[type] ?? 0;
}

/** Quantity with the sign the movement's type actually implies. */
export function signedMovementQuantity(movement: { type: StockMovementType; quantity: Decimalish }): number {
  return round(Math.abs(num(movement.quantity)) * (movementDirection(movement.type) || 1), 3);
}

export type StockLevel = "negative" | "out" | "low" | "ok";

/** Derived stock state — the backend stores no status column. */
export function stockLevel(product: Pick<Product, "currentStock" | "lowStockThreshold">): StockLevel {
  const stock = num(product.currentStock);
  const threshold = product.lowStockThreshold === null || product.lowStockThreshold === undefined
    ? null
    : num(product.lowStockThreshold);

  if (stock < 0) return "negative";
  if (stock <= 0) return "out";
  if (threshold !== null && stock <= threshold) return "low";
  return "ok";
}

// ---------------------------------------------------------------------------
// BOM
// ---------------------------------------------------------------------------

export interface BOMRequirement {
  productId: string;
  name: string;
  sku: string | null;
  perUnit: number;
  required: number;
  available: number;
  shortage: number;
  sufficient: boolean;
}

/**
 * Flattens the direct children of a BOM tree into per-unit and total
 * requirements for `quantity` units, plus a shortage preview against the
 * stock figures the tree already carries.
 */
export function bomRequirements(bom: BOMTreeNode | undefined, quantity: number): BOMRequirement[] {
  if (!bom) return [];
  return bom.children.map((child) => {
    const perUnit = num(child.quantityRequired);
    const required = round(perUnit * quantity, 3);
    const available = num(child.currentStock);
    const shortage = round(Math.max(0, required - available), 3);
    return {
      productId: child.productId,
      name: child.name,
      sku: child.sku,
      perUnit,
      required,
      available,
      shortage,
      sufficient: shortage === 0,
    };
  });
}

/** Suggested material cost for `quantity` units, from a priced BOM breakdown. */
export function bomSuggestedCost(
  breakdown: { quantity: number; unitPrice: number }[],
  quantity = 1,
): number {
  return round(breakdown.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0) * quantity);
}

/** Margin of a selling price over its material cost, as a percentage. */
export function margin(sellingPrice: number, cost: number): number {
  if (!sellingPrice) return 0;
  return round(((sellingPrice - cost) / sellingPrice) * 100, 1);
}

// ---------------------------------------------------------------------------
// Production tasks
// ---------------------------------------------------------------------------

export interface TaskProgress {
  planned: number;
  completed: number;
  remaining: number;
  completionPercentage: number;
  isFullyCompleted: boolean;
}

/** Live production progress for a task — mirrors `reportProduction` arithmetic. */
export function taskProgress(task: Pick<Task, "productionQuantity" | "completedQuantity" | "remainingQuantity">): TaskProgress {
  const planned = num(task.productionQuantity);
  const completed = num(task.completedQuantity);
  const remaining = num(task.remainingQuantity, Math.max(0, planned - completed));
  return {
    planned,
    completed,
    remaining,
    completionPercentage: percent(completed, planned),
    isFullyCompleted: planned > 0 && remaining <= 0,
  };
}

/**
 * Share of each allocated batch consumed when reporting `completedQuantity`
 * units — the backend consumes `allocatedQuantity × (completed / planned)`.
 */
export function consumptionRatio(completedQuantity: number, productionQuantity: number): number {
  if (!productionQuantity) return 0;
  return completedQuantity / productionQuantity;
}

/** Preview of material draw-down for a partial production report. */
export function previewConsumption(task: Task, completedQuantity: number) {
  const ratio = consumptionRatio(completedQuantity, num(task.productionQuantity));
  return (task.batchAllocations ?? []).map((alloc) => ({
    batchId: alloc.batchId,
    batchNumber: alloc.batch.batchNumber,
    productName: alloc.batch.product?.name ?? "—",
    allocated: num(alloc.allocatedQuantity),
    willConsume: round(num(alloc.allocatedQuantity) * ratio, 3),
  }));
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

/** Hours between two timestamps, to 2dp — the backend's `diffMs / 3_600_000`. */
export function hoursBetween(from: string | Date | null, to: string | Date | null): number {
  if (!from || !to) return 0;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return round((b - a) / 3_600_000);
}

/** Hours worked so far today — counts up from check-in when still clocked in. */
export function liveWorkedHours(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn) return 0;
  return hoursBetween(checkIn, checkOut ?? new Date());
}

/** Overtime = max(0, worked − required). */
export function overtimeHours(worked: number, required: number): number {
  return round(Math.max(0, worked - required));
}

/** The overtime figure that actually counts: an admin edit overrides the clocked value. */
export function effectiveOvertime(record: Pick<Attendance, "overtimeHours" | "adminOvertimeHours">): number {
  return record.adminOvertimeHours !== null && record.adminOvertimeHours !== undefined
    ? num(record.adminOvertimeHours)
    : num(record.overtimeHours);
}

export interface AttendanceTotals {
  daysAttended: number;
  workedHours: number;
  requiredHours: number;
  overtimeHours: number;
  approvedOvertimeHours: number;
  pendingOvertimeHours: number;
  rejectedOvertimeHours: number;
}

/** Aggregates a set of attendance rows the same way the backend report does. */
export function attendanceTotals(records: Attendance[]): AttendanceTotals {
  const totals: AttendanceTotals = {
    daysAttended: 0,
    workedHours: 0,
    requiredHours: 0,
    overtimeHours: 0,
    approvedOvertimeHours: 0,
    pendingOvertimeHours: 0,
    rejectedOvertimeHours: 0,
  };

  for (const rec of records) {
    if (rec.checkIn) totals.daysAttended += 1;
    totals.workedHours += num(rec.workedHours);
    totals.requiredHours += num(rec.requiredHours, 8);

    const ot = effectiveOvertime(rec);
    totals.overtimeHours += ot;
    if (rec.overtimeStatus === "APPROVED") totals.approvedOvertimeHours += ot;
    else if (rec.overtimeStatus === "REJECTED") totals.rejectedOvertimeHours += ot;
    else totals.pendingOvertimeHours += ot;
  }

  return {
    daysAttended: totals.daysAttended,
    workedHours: round(totals.workedHours),
    requiredHours: round(totals.requiredHours),
    overtimeHours: round(totals.overtimeHours),
    approvedOvertimeHours: round(totals.approvedOvertimeHours),
    pendingOvertimeHours: round(totals.pendingOvertimeHours),
    rejectedOvertimeHours: round(totals.rejectedOvertimeHours),
  };
}

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

/** Overtime hourly rate = base rate × multiplier. */
export function overtimeRate(hourlyRate: number, multiplier: number): number {
  return round(hourlyRate * multiplier);
}

export interface EarningsPreview {
  regularEarnings: number;
  overtimeEarnings: number;
  totalEarned: number;
}

/**
 * Live earnings preview. Only *approved* overtime is paid — the same rule the
 * payroll service applies — so pending hours are deliberately excluded.
 */
export function earningsPreview(params: {
  regularHours: number;
  approvedOvertimeHours: number;
  hourlyRate: number;
  overtimeMultiplier: number;
}): EarningsPreview {
  const regularEarnings = round(params.regularHours * params.hourlyRate);
  const overtimeEarnings = round(params.approvedOvertimeHours * overtimeRate(params.hourlyRate, params.overtimeMultiplier));
  return { regularEarnings, overtimeEarnings, totalEarned: round(regularEarnings + overtimeEarnings) };
}

/** Unpaid balance, floored at zero exactly as the backend does. */
export function remainingBalance(totalEarned: number, salaryPaid: number): number {
  return Math.max(0, round(totalEarned - salaryPaid));
}

/** Payment state derived from earned vs paid. */
export function paymentStatus(totalEarned: number, salaryPaid: number): PaymentStatus {
  if (salaryPaid >= totalEarned && totalEarned > 0) return "PAID";
  if (salaryPaid > 0) return "PARTIALLY_PAID";
  return "UNPAID";
}
