/**
 * Prisma returns `Decimal` columns as strings to preserve precision, so a field
 * the frontend types as `number` arrives as `"355"`. TypeScript cannot catch
 * this — the types claim number and the runtime disagrees — and the failure is
 * silent and wrong rather than loud: `"355" + 7` is `"3557"`, and sorting
 * compares lexically, so 9 sorts after 100.
 *
 * Rather than coerce at each of the ~40 places these values surface, they are
 * normalised once as responses arrive. The conversion is keyed on field name
 * against the Decimal columns declared in `schema.prisma`, and only applies to
 * strings that are entirely numeric — so an id, a code or a formatted string
 * that happens to share a name is left alone.
 */

/** Every `Decimal` column in the Prisma schema. Keep in step with the schema. */
export const DECIMAL_FIELDS = new Set([
  "adminOvertimeHours",
  "allocatedQuantity",
  "amount",
  "calculatedHours",
  "completedQuantity",
  "currentStock",
  "dailyRate",
  "hourlyRate",
  "initialQuantity",
  "inventoryValue",
  "lowStockThreshold",
  "newQuantity",
  "overtimeHours",
  "overtimeMultiplier",
  "previousQuantity",
  "productionQuantity",
  "quantity",
  "quantityInReorder",
  "quantityRequired",
  "remainingQuantity",
  "requiredDailyHours",
  "requiredHours",
  "reservedQuantity",
  "totalCogs",
  "totalCost",
  "totalPurchases",
  "unitCost",
  "unitPrice",
  "workedHours",
]);

const NUMERIC = /^-?\d+(\.\d+)?$/;

/** Guard against a pathological payload turning normalisation into a hang. */
const MAX_DEPTH = 12;

/**
 * Returns the value with every known Decimal field converted to a number.
 * Structure, key order and all other values are preserved.
 */
export function coerceDecimals<T>(value: T, depth = 0): T {
  if (value === null || value === undefined || depth > MAX_DEPTH) return value;

  if (Array.isArray(value)) {
    return value.map((item) => coerceDecimals(item, depth + 1)) as unknown as T;
  }

  if (typeof value === "object") {
    // Dates and other non-plain objects must survive untouched.
    if (value instanceof Date) return value;

    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (DECIMAL_FIELDS.has(key) && typeof item === "string" && NUMERIC.test(item)) {
        out[key] = Number(item);
      } else {
        out[key] = coerceDecimals(item, depth + 1);
      }
    }
    return out as T;
  }

  return value;
}
