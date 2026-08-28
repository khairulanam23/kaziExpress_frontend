/**
 * Finished goods, dispositions and profit.
 *
 * `costIsFinal` / `costWasFinal` matter throughout: a batch from a production
 * run that has not finished carries material cost only, because labour cannot
 * be apportioned until the run ends. Selling from one is allowed, but the
 * screen must say so rather than present the margin as settled.
 */

export type DispositionType = "CUSTOMER_SALE" | "STORE_TRANSFER" | "WRITE_OFF";
export type CustomerType = "RETAIL" | "WHOLESALE" | "OWN_STORE";
export type FinishedGoodsStatus = "UNSOLD" | "PARTLY_SOLD" | "FULLY_DISPOSED";

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { dispositions: number };
}

export interface FinishedGoodsItem {
  batchId: string;
  batchNumber: string;
  product: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
    imageUrl: string | null;
    sellingPrice: number | null;
  };
  producedBy: Array<{ id: string; name: string; avatarUrl: string | null }>;
  producedByTask: { id: string; title: string; status: string; completedAt: string | null } | null;
  producedAt: string;
  initialQuantity: number;
  remainingQuantity: number;
  disposedQuantity: number;
  unitCost: number;
  materialUnitCost: number | null;
  labourUnitCost: number | null;
  costIsFinal: boolean;
  stockValueRemaining: number;
  revenueToDate: number;
  profitToDate: number;
  suggestedMargin: number | null;
  status: FinishedGoodsStatus;
  dispositionCount: number;
}

export interface FinishedGoodsResponse {
  summary: {
    batches: number;
    unsold: number;
    partlySold: number;
    fullyDisposed: number;
    provisionalCost: number;
    unitsOnHand: number;
    stockValue: number;
    revenueToDate: number;
    profitToDate: number;
  };
  items: FinishedGoodsItem[];
}

export interface Disposition {
  id: string;
  dispositionNumber: string;
  type: DispositionType;
  quantity: number;
  unitSellingPrice: number;
  totalRevenue: number;
  unitCogs: number;
  totalCogs: number;
  grossProfit: number;
  costWasFinal: boolean;
  reason: string | null;
  notes: string | null;
  dispositionedAt: string;
  reversedAt: string | null;
  reversalReason: string | null;
  customer: { id: string; name: string; type?: CustomerType } | null;
  product?: { id: string; name: string; sku: string | null; unit: string | null };
  batch?: { id: string; batchNumber: string };
  recordedBy?: { id: string; name: string | null; email: string };
}

export interface FinishedGoodsBatchDetail {
  batchId: string;
  batchNumber: string;
  product: { id: string; name: string; sku: string | null; unit: string | null; unitPrice: number; sellingPrice: number | null };
  producedByTask: {
    id: string; title: string; status: string; startedAt: string | null; completedAt: string | null;
    assignments: Array<{ employee: { id: string; name: string | null; email: string } }>;
  } | null;
  producedAt: string;
  initialQuantity: number;
  remainingQuantity: number;
  cost: {
    material: number | null;
    labour: number | null;
    unit: number;
    isFinal: boolean;
    finalizedAt: string | null;
  };
  status: FinishedGoodsStatus;
  dispositions: Disposition[];
}

export interface DispositionListResponse {
  totalData: number;
  page: number;
  showPerPage: number;
  dispositions: Disposition[];
}

export interface ProfitRow {
  name: string;
  productId?: string;
  customerId?: string | null;
  type?: CustomerType | null;
  sku?: string | null;
  unit?: string | null;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  writeOffCost: number;
  marginPercent: number | null;
  sales: number;
}

export interface ProfitReport {
  basis: string;
  period: { from: string; to: string };
  summary: {
    sales: number;
    unitsSold: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    marginPercent: number | null;
    writeOffs: number;
    writeOffCost: number;
    netOfWriteOffs: number;
    salesWithProvisionalCost: number;
  };
  byProduct: ProfitRow[];
  byCustomer: ProfitRow[];
  byMonth: Array<{
    month: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    unitsSold: number;
    marginPercent: number | null;
  }>;
  recent: Array<{
    id: string;
    dispositionNumber: string;
    type: DispositionType;
    product: string;
    sku: string | null;
    batchNumber: string;
    customer: string | null;
    quantity: number;
    unitSellingPrice: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    marginPercent: number | null;
    costWasFinal: boolean;
    reason: string | null;
    at: string;
  }>;
}
