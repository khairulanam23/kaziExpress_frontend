/**
 * Payload types for the analytical reports added from the roadmap.
 *
 * Several of these carry a `basis` string. It is the server stating the
 * assumption behind a derived figure (how labour was attributed, how a batch
 * was valued) and is meant to be shown, not swallowed — a number presented
 * without its basis reads as measured when it was estimated.
 */

export interface WasteGroupRow {
  events: number;
  quantity: number;
  cost: number;
  shareOfCost: number;
  productId?: string;
  name?: string;
  sku?: string | null;
  unit?: string | null;
  taskId?: string;
  title?: string;
  employeeId?: string;
  reason?: string;
}

export interface WasteReport {
  period: { from: string; to: string };
  summary: {
    events: number;
    totalQuantity: number;
    totalCost: number;
    damagedCost: number;
    writtenOffCost: number;
  };
  byProduct: WasteGroupRow[];
  byTask: WasteGroupRow[];
  byEmployee: WasteGroupRow[];
  byReason: WasteGroupRow[];
  recent: Array<{
    id: string;
    type: string;
    product: string | undefined;
    sku: string | null | undefined;
    quantity: number;
    cost: number;
    reason: string | null;
    task: string | null;
    employee: string | null;
    at: string;
  }>;
}

export type ReorderUrgency = "CRITICAL" | "ORDER_NOW" | "MONITOR" | "OK";

export interface ReorderItem {
  productId: string;
  name: string;
  sku: string | null;
  unit: string | null;
  /** A composite is built in-house, so the answer is a production run, not a PO. */
  action: "PURCHASE" | "PRODUCE";
  vendor: { id: string; name: string } | null;
  currentStock: number;
  lowStockThreshold: number | null;
  averageDailyConsumption: number;
  daysOfCoverRemaining: number | null;
  leadTimeDays: number | null;
  suggestedOrderQuantity: number;
  estimatedOrderCost: number;
  urgency: ReorderUrgency;
  reason: string;
}

export interface ReorderReport {
  basis: string;
  parameters: { lookbackDays: number; horizonDays: number };
  summary: {
    productsReviewed: number;
    critical: number;
    orderNow: number;
    monitor: number;
    toPurchase: number;
    toProduce: number;
    estimatedOrderCost: number;
  };
  items: ReorderItem[];
}

export interface ProductionCostRun {
  taskId: string;
  title: string;
  product: { id: string; name: string; sku: string | null; unit: string | null } | null;
  targetQuantity: number;
  producedQuantity: number;
  materialCost: number;
  plannedMaterialCost: number;
  materialVariance: number;
  wasteCost: number;
  labourHours: number;
  labourCost: number;
  totalCost: number;
  costPerUnit: number | null;
  completedAt: string | null;
  onTime: boolean | null;
}

export interface ProductionCostReport {
  basis: string;
  period: { from: string; to: string };
  summary: {
    runs: number;
    unitsProduced: number;
    materialCost: number;
    labourCost: number;
    wasteCost: number;
    totalCost: number;
    averageCostPerUnit: number | null;
  };
  byProduct: Array<{
    productId: string;
    name: string;
    sku: string | null;
    unit: string | null;
    runs: number;
    unitsProduced: number;
    materialCost: number;
    labourCost: number;
    wasteCost: number;
    totalCost: number;
    averageCostPerUnit: number | null;
  }>;
  runs: ProductionCostRun[];
}

export interface ValuationReport {
  basis: string;
  summary: {
    products: number;
    batches: number;
    batchesValuedAtListPrice: number;
    totalValueAtCost: number;
    totalValueAtListPrice: number;
    variance: number;
  };
  items: Array<{
    productId: string;
    name: string;
    sku: string | null;
    unit: string | null;
    itemType: string;
    listUnitPrice: number;
    batches: number;
    quantity: number;
    reserved: number;
    actualValue: number;
    listValue: number;
    variance: number;
    weightedUnitCost: number;
    oldestBatchAt: string;
  }>;
}

export interface LabourEfficiencyReport {
  basis: string;
  period: { from: string; to: string };
  summary: {
    tasksCompleted: number;
    unitsProduced: number;
    attributedHours: number;
    labourCost: number;
    tasksWithDeadline: number;
    onTimeRate: number | null;
  };
  employees: Array<{
    employeeId: string;
    name: string;
    department: string | null;
    designation: string | null;
    tasksCompleted: number;
    unitsProduced: number;
    attributedHours: number;
    totalHoursWorked: number;
    labourCost: number;
    unitsPerHour: number | null;
    costPerUnit: number | null;
    onTime: number;
    late: number;
    onTimeRate: number | null;
  }>;
}

export interface VendorPerformanceReport {
  basis: string;
  period: { from: string; to: string };
  summary: {
    vendors: number;
    deliveries: number;
    unattributedDeliveries: number;
    totalSpend: number;
  };
  vendors: Array<{
    vendorId: string;
    name: string;
    isActive: boolean;
    deliveries: number;
    quantity: number;
    spend: number;
    productsSupplied: number;
    productsWithRisingPrice: number;
    largestPriceRisePercent: number | null;
    products: Array<{
      productId: string;
      name: string;
      sku: string | null;
      unit: string | null;
      deliveries: number;
      quantity: number;
      spend: number;
      averageUnitCost: number;
      firstUnitCost: number;
      lastUnitCost: number;
      minUnitCost: number;
      maxUnitCost: number;
      priceDriftPercent: number | null;
      firstAt: string;
      lastAt: string;
    }>;
  }>;
}

export interface TraceNode {
  batchId: string;
  batchNumber: string;
  product: { id: string; name: string; sku: string | null; unit: string | null };
  initialQuantity: number;
  remainingQuantity: number;
  quantityInThisLink: number | null;
  createdAt: string;
  producedByTask: { id: string; title: string; completedAt: string | null } | null;
  depth: number;
  children: TraceNode[];
  truncated?: boolean;
}

export interface BatchTrace {
  batch: {
    id: string;
    batchNumber: string;
    product: { id: string; name: string; sku: string | null; unit: string | null };
    initialQuantity: number;
    remainingQuantity: number;
    createdAt: string;
    producedByTask: { id: string; title: string; completedAt: string | null } | null;
  };
  upstream: TraceNode;
  downstream: TraceNode;
  summary: {
    isPurchased: boolean;
    originBatches: number;
    affectedBatches: number;
    affectedProducts: number;
    stillInStock: number;
    maxDepthReached: boolean;
  };
  recallList: Array<{
    batchId: string;
    batchNumber: string;
    product: { id: string; name: string; sku: string | null; unit: string | null };
    remainingQuantity: number;
    producedByTask: { id: string; title: string; completedAt: string | null } | null;
    depth: number;
  }>;
  movements: Array<{
    id: string;
    type: string;
    quantity: number;
    totalCost: number;
    reason: string | null;
    task: { id: string; title: string } | null;
    performedBy: { id: string; name: string | null } | null;
    at: string;
  }>;
}
