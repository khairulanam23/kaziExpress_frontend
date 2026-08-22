// ---------------------------------------------------------------------------
// Shared enums — mirrors prisma/schema.prisma on the backend exactly.
// ---------------------------------------------------------------------------
export type Role = "ADMIN" | "EMPLOYEE";
export type PayCalculationMode = "HOURLY" | "DAILY_PLUS_OVERTIME";

export type TaskStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "PARTIALLY_COMPLETED"
  | "COMPLETED"
  | "CANCELLED";

export type StockMovementType =
  | "PURCHASE"
  | "CONSUMPTION"
  | "ADJUSTMENT"
  | "WRITE_OFF"
  | "RETURN"
  | "ASSEMBLY"
  | "TASK_RESERVATION"
  | "TASK_RELEASE"
  | "DAMAGE"
  | "REFILL";

export type ProductRequestType = "TASK_RELATED" | "GENERAL";
export type ProductRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AttendanceSource = "FINGERPRINT" | "MANUAL" | "WEB";
export type OvertimeStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ItemType = "COMPONENT" | "PRODUCT";
export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

/** Prisma `Decimal` columns are serialised as strings; numeric aggregates come back as numbers. */
export type Decimalish = string | number;

/** Minimal user shape used by every `include: { select: { id, name, email } }` on the backend. */
export interface UserRef {
  id: string;
  name: string | null;
  email?: string;
}

// ---------------------------------------------------------------------------
// Auth / Users
// ---------------------------------------------------------------------------
export interface EmployeeProfile {
  id: string;
  userId: string;
  hourlyRate: Decimalish;
  dailyRate: Decimalish | null;
  payCalculationMode: PayCalculationMode;
  overtimeMultiplier: Decimalish;
  lateGraceMinutes: number;
  earlyLeavePenalty: boolean;
  missingPunchRules?: Record<string, unknown> | null;
  department: string | null;
  designation: string | null;
  joinDate: string | null;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLogin: string | null;
  fingerprintRegistered?: boolean;

  /** Profile photo — a public asset, unlike legal documents. */
  avatarUrl?: string | null;

  /** Personal / legal identity. */
  dateOfBirth?: string | null;
  nidNumber?: string | null;

  /** Emergency contact. */
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;

  employeeProfile?: EmployeeProfile | null;
  estimatedEarnings?: EarningsBreakdown | null;

  /**
   * Effective permission keys, resolved server-side from the role's defaults
   * plus any explicit grants. Returned by `/auth/login` and `/auth/me`.
   */
  permissions?: string[];
}

/** GET /users/me/earnings */
export interface EarningsBreakdown {
  from: string;
  to: string;
  daysWorked: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalEstimatedPay: number;
  payCalculationMode: string;
  currency: string;
}

/** GET /users/:id/performance */
export interface PerformanceSummary {
  userId: string;
  period: { year: number; month: number; from: string; to: string };
  tasks: {
    assigned: number;
    completed: number;
    inProgress: number;
    pending: number;
    cancelled: number;
    completionRate: number;
    completedTaskDates: string[];
  };
  attendance: { daysWorked: number; totalHours: number; regularHours: number; overtimeHours: number };
  earnings: {
    regularPay: number;
    overtimePay: number;
    totalEstimatedPay: number;
    hourlyRate: number;
    dailyRate: number;
    estimatedDailyIncome: number;
    payCalculationMode: string;
    currency: string;
  };
}

// ---------------------------------------------------------------------------
// Vendors / Categories
// ---------------------------------------------------------------------------
export interface Vendor {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: { products: number };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export interface BOMSummaryItem {
  childProductId: string;
  name: string;
  sku: string | null;
  quantityRequired: number;
  unitPrice: number;
  currentStock: number;
}

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  itemType: ItemType;
  unit: string;
  remarks: string | null;
  unitPrice: Decimalish;
  currency: string;
  currentStock: Decimalish;
  lowStockThreshold: Decimalish | null;
  reorderTimeDays: number | null;
  quantityInReorder: Decimalish | null;
  isComposite: boolean;
  isDiscontinued: boolean;
  imageUrl?: string | null;
  imageStorageId?: string | null;
  negativeSince: string | null;
  negativeStockAllowedUntil?: string | null;
  vendorId: string | null;
  vendor?: { id: string; name: string } | null;
  vendors?: { id: string; name: string }[];
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  categories?: { id: string; name: string }[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  daysNegative?: number;
  bomSummary?: BOMSummaryItem[];
  materialCost?: number;
}

/** GET /products/:id/bom */
export interface BOMTreeNode {
  productId: string;
  name: string;
  sku: string | null;
  isComposite: boolean;
  quantityRequired: number;
  currentStock: number;
  children: BOMTreeNode[];
}

/** GET /products/:id/bom/cost */
export interface BOMCostBreakdownItem {
  itemId: string;
  itemName: string;
  sku: string | null;
  itemType: ItemType;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ProductCostResult {
  productId: string;
  productName: string;
  sku: string | null;
  unit: string;
  adminUnitPrice: number;
  suggestedCost: number;
  priceWarning: boolean;
  warningMessage: string | null;
  breakdown: BOMCostBreakdownItem[];
}

// ---------------------------------------------------------------------------
// Inventory batches & stock movements
// ---------------------------------------------------------------------------
export interface InventoryBatch {
  id: string;
  batchNumber: string;
  productId: string;
  product?: { id: string; name: string; sku: string | null; itemType?: ItemType; unit?: string };
  initialQuantity: Decimalish;
  remainingQuantity: Decimalish;
  reservedQuantity: Decimalish;
  createdById: string;
  createdBy?: UserRef;
  sourceTaskId: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  product?: { id: string; name: string; sku: string | null; unit?: string; itemType?: ItemType };
  batchId: string | null;
  batch?: { id: string; batchNumber: string; remainingQuantity?: Decimalish } | null;
  type: StockMovementType;
  quantity: Decimalish;
  previousQuantity: Decimalish | null;
  newQuantity: Decimalish | null;
  unitCost: Decimalish;
  totalCost: Decimalish;
  relatedTaskId: string | null;
  relatedTask?: { id: string; title: string } | null;
  relatedRequestId?: string | null;
  performedById?: string | null;
  performedBy?: UserRef | null;
  notes: string | null;
  reason?: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Production tasks
// ---------------------------------------------------------------------------
export interface TaskAssignment {
  id: string;
  taskId?: string;
  employeeId: string;
  assignedAt?: string;
  employee: UserRef;
}

export interface TaskRequiredProduct {
  id: string;
  taskId?: string;
  productId: string;
  quantity: Decimalish;
  unitPrice: Decimalish | null;
  unit: string | null;
  product: { id: string; name: string; sku: string | null; unit?: string; unitPrice?: Decimalish };
}

export interface TaskBatchAllocation {
  id: string;
  taskId?: string;
  batchId: string;
  allocatedQuantity: Decimalish;
  batch: {
    id: string;
    batchNumber: string;
    remainingQuantity: Decimalish;
    reservedQuantity?: Decimalish;
    product?: { id: string; name: string; sku: string | null };
  };
}

/** Immutable BOM snapshot stored on the task at creation time. */
export interface TaskProductSnapshotLine {
  productId: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  productId: string | null;
  product?: { id: string; name: string; sku: string | null; unit?: string; itemType?: ItemType; unitPrice?: Decimalish; imageUrl?: string | null } | null;
  productionQuantity: Decimalish;
  completedQuantity: Decimalish;
  remainingQuantity: Decimalish;
  deadline: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  parentTaskId: string | null;
  createdById: string;
  createdBy: UserRef;
  completedById: string | null;
  completedBy?: UserRef | null;
  completedAt: string | null;
  productsSnapshot: TaskProductSnapshotLine[] | null;
  createdAt: string;
  updatedAt?: string;
  assignments: TaskAssignment[];
  requiredProducts?: TaskRequiredProduct[];
  batchAllocations?: TaskBatchAllocation[];
  outputBatches?: { id: string; batchNumber: string; remainingQuantity: Decimalish; createdAt: string }[];
  subTasks?: { id: string; title: string; status: TaskStatus; productionQuantity: Decimalish }[];
}

// ---------------------------------------------------------------------------
// Product / refill requests
// ---------------------------------------------------------------------------
export interface BOMSnapshotComponent {
  productId: string;
  name: string;
  sku: string | null;
  quantityRequiredPerUnit: number;
  totalQuantityRequired: number;
  unitPrice?: number;
}

export interface BOMSnapshot {
  productId: string;
  name: string;
  sku: string | null;
  isComposite: boolean;
  quantity: number;
  bomComponents: BOMSnapshotComponent[];
}

export interface BOMPreview {
  isComposite: boolean;
  product: { id: string; name: string; sku: string | null };
  quantity: number;
  components: {
    productId: string;
    name: string;
    sku: string | null;
    quantityRequiredPerUnit: number;
    totalQuantityRequired: number;
    currentStock?: number;
  }[];
}

export interface ProductRequest {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string | null; unit?: string; currentStock?: Decimalish; isComposite?: boolean };
  quantity: Decimalish;
  type: ProductRequestType;
  status: ProductRequestStatus;
  taskId: string | null;
  task?: { id: string; title: string; status: TaskStatus } | null;
  requestedById: string;
  requestedBy: UserRef;
  approvedById: string | null;
  approvedBy?: UserRef | null;
  reason: string | null;
  rejectionReason: string | null;
  bomSnapshot?: BOMSnapshot | null;
  stockMovements?: { id: string }[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------
export interface Attendance {
  id: string;
  employeeId: string;
  employee?: UserRef;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workedHours: Decimalish | null;
  calculatedHours: Decimalish | null;
  requiredHours: Decimalish;
  overtimeHours: Decimalish | null;
  adminOvertimeHours: Decimalish | null;
  overtimeStatus: OvertimeStatus;
  overtimeReason: string | null;
  overtimeDecidedById: string | null;
  overtimeDecidedBy?: UserRef | null;
  overtimeDecidedAt: string | null;
  lateMinutes: number;
  earlyMinutes: number;
  source: AttendanceSource;
  isOverride: boolean;
  overriddenById: string | null;
  overriddenBy?: UserRef | null;
  overrideReason: string | null;
  overrideOldValues?: Record<string, unknown> | null;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
}

/** GET /attendance/me/today */
export interface TodayStatus {
  date: string;
  checkedIn: boolean;
  checkedOut: boolean;
  checkIn: string | null;
  checkOut: string | null;
  workedHours: number;
  requiredHours: number;
  overtimeHours: number;
  adminOvertimeHours: number | null;
  overtimeStatus: OvertimeStatus;
  attendance: Attendance | null;
}

/** GET /attendance/overtime/monthly */
export interface OvertimeMonthlyReport {
  year: number;
  month: number;
  employeeSummaries: {
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    year: number;
    month: number;
    totalWorkedHours: number;
    totalOvertime: number;
    approvedOvertime: number;
    rejectedOvertime: number;
    pendingOvertime: number;
    recordCount: number;
  }[];
}

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------
export interface SalaryPayment {
  id: string;
  employeeId: string;
  employee?: UserRef;
  year: number;
  month: number;
  amount: Decimalish;
  note: string | null;
  paidById: string;
  paidBy?: UserRef;
  createdAt: string;
}

/** GET /payroll/me, GET /payroll/employees/:id */
export interface PayrollSummary {
  employee: { id: string; name: string | null; email: string; role: Role };
  year: number;
  month: number;
  hourlyRate: number;
  overtimeMultiplier: number;
  overtimeRate: number;
  workedHoursTotal: number;
  regularHours: number;
  regularEarnings: number;
  overtimeWorkedHours: number;
  approvedOvertimeHours: number;
  pendingOvertimeHours: number;
  rejectedOvertimeHours: number;
  overtimeEarnings: number;
  totalEarned: number;
  salaryPaid: number;
  remainingBalance: number;
  status: PaymentStatus;
  payments: SalaryPayment[];
  attendanceCount: number;
}

/** GET /payroll/overview */
export interface PayrollOverview {
  year: number;
  month: number;
  summaries: PayrollSummary[];
  totals: {
    totalRegularEarnings: number;
    totalOvertimeEarnings: number;
    totalEarned: number;
    totalPaid: number;
    totalRemaining: number;
  };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  targetUrl: string | null;
  isRead: boolean;
  eventKey: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  data: Notification[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ---------------------------------------------------------------------------
// Dashboard  (GET /dashboard/overview — shape depends on role)
// ---------------------------------------------------------------------------
export interface AdminDashboardOverview {
  period: { from: string; to: string };
  inventory: {
    totalActiveItems: number;
    totalComponents: number;
    totalFinishedProducts: number;
    totalInventoryQuantity: number;
    totalInventoryValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    recentStockMovements: StockMovement[];
  };
  production: {
    totalActiveProductionTasks: number;
    pendingTasks: number;
    acceptedTasks: number;
    inProgressTasks: number;
    partiallyCompletedTasks: number;
    completedTasks: number;
    cancelledTasks: number;
    productionQuantityCompletedInPeriod: number;
  };
  employees: {
    totalActiveEmployees: number;
    checkedInToday: number;
    employeesCurrentlyAbsent: number;
    pendingOvertimeCount: number;
  };
  payroll: {
    year: number;
    month: number;
    currentMonthTotalEarnings: number;
    currentMonthPaidAmount: number;
    currentMonthRemainingBalance: number;
    unpaidEmployeesCount: number;
    partiallyPaidEmployeesCount: number;
  };
  notifications: { unreadCount: number; latestNotifications: Notification[] };
}

export interface EmployeeDashboardOverview {
  period: { from: string; to: string };
  tasks: { assignedActiveTasks: number; completedTasksInPeriod: number };
  attendance: { todayStatus: "ABSENT" | "CHECKED_IN" | "CHECKED_OUT"; todayAttendance: Attendance | null };
  payroll: { year: number; month: number; totalEarned: number; totalPaid: number; remainingBalance: number };
  notifications: { unreadCount: number; latestNotifications: Notification[] };
}

export type DashboardOverview = AdminDashboardOverview | EmployeeDashboardOverview;

export function isAdminOverview(d: DashboardOverview | undefined): d is AdminDashboardOverview {
  return !!d && "inventory" in d;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export interface InventoryReport {
  summary: {
    totalItems: number;
    totalComponents: number;
    totalProducts: number;
    totalQuantity: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  byCategory: { name: string; count: number; value: number }[];
  byVendor: { name: string; count: number; value: number }[];
  recentMovements: StockMovement[];
  items: Product[];
}

export interface StockMovementReport {
  movements: StockMovement[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ProductionReport {
  summary: {
    totalTasks: number;
    completedTasks: number;
    partiallyCompletedTasks: number;
    cancelledTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    totalPlannedQuantity: number;
    totalCompletedQuantity: number;
    totalRemainingQuantity: number;
    completionPercentage: number;
  };
  employeeSummaries: {
    employeeId: string;
    employeeName: string;
    email: string;
    assignedTasks: number;
    completedTasks: number;
    plannedQty: number;
    completedQty: number;
    remainingQty: number;
    completionPercentage: number;
  }[];
  tasks: Task[];
}

export interface AttendanceReport {
  period: { from: string; to: string };
  summary: {
    totalEmployees: number;
    totalDaysAttended: number;
    totalWorkedHours: number;
    totalApprovedOvertime: number;
  };
  employeeSummaries: {
    employeeId: string;
    employeeName: string;
    email: string;
    daysAttended: number;
    workedHours: number;
    requiredHours: number;
    overtimeHours: number;
    approvedOvertimeHours: number;
    rejectedOvertimeHours: number;
    pendingOvertimeHours: number;
    lateOccurrences: number;
  }[];
  records: Attendance[];
}

export interface PayrollReport {
  period: { year: number; month: number };
  summary: {
    totalEmployees: number;
    totalEarned: number;
    totalPaid: number;
    totalRemaining: number;
    totalApprovedOvertimeEarnings: number;
    unpaidEmployees: number;
    partiallyPaidEmployees: number;
    fullyPaidEmployees: number;
  };
  employeeBreakdown: {
    employee: { id: string; name: string | null; email: string; role: Role };
    hourlyRate: number;
    workedHours: number;
    regularEarnings: number;
    approvedOvertimeHours: number;
    overtimeEarnings: number;
    totalEarned: number;
    totalPaid: number;
    remainingBalance: number;
    paymentStatus: PaymentStatus;
  }[];
}

export interface EmployeePerformanceReport {
  employee: { id: string; name: string | null; email: string; role: Role; isActive: boolean };
  period: { from: string; to: string };
  attendance: {
    daysAttended: number;
    totalWorkedHours: number;
    overtimeHours: number;
    approvedOvertimeHours: number;
    lateOccurrences: number;
  };
  production: {
    assignedTasks: number;
    completedTasks: number;
    cancelledTasks: number;
    plannedQuantity: number;
    completedQuantity: number;
    completionRate: number;
  };
  payroll: { year: number; month: number; totalEarned: number; paidAmount: number; remainingBalance: number };
}

// ---------------------------------------------------------------------------
// System config
// ---------------------------------------------------------------------------
export type SystemConfigMap = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Generic list envelope + navigation
// ---------------------------------------------------------------------------
export interface Paginated<T> {
  totalData: number;
  totalPages: number;
  currentPage?: number;
  [key: string]: T[] | number | undefined;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  /** Permission the destination's primary endpoint requires. */
  permission?: string;
  /** Destination is reachable if the user holds any one of these. */
  anyOf?: readonly string[];
  /** Reserved for the few screens that are genuinely role-gated server-side. */
  adminOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Profile, legal documents & organisation
// ---------------------------------------------------------------------------
export type DocumentCategory = "PERSONAL" | "BUSINESS";

/** Document kinds the UI offers. The backend column is free-form, so adding
 *  a kind here needs no migration. */
export const DOCUMENT_TYPE_OPTIONS = [
  { value: "NID", label: "National ID (NID)", category: "PERSONAL" },
  { value: "PASSPORT", label: "Passport", category: "PERSONAL" },
  { value: "OTHER_ID", label: "Other identification", category: "PERSONAL" },
  { value: "OTHER_LEGAL", label: "Other legal document", category: "PERSONAL" },
  { value: "BUSINESS_REGISTRATION", label: "Business registration", category: "BUSINESS" },
  { value: "TRADE_LICENSE", label: "Trade / business licence", category: "BUSINESS" },
  { value: "TAX_DOCUMENT", label: "Tax document", category: "BUSINESS" },
] as const;

/**
 * A stored legal document.
 *
 * Deliberately carries no URL or storage id — the bytes are fetched through
 * the authenticated document endpoint keyed on `id` alone.
 */
export interface LegalDocument {
  id: string;
  userId: string;
  name: string;
  documentType: string;
  category: DocumentCategory;
  originalFileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  expiryDate: string | null;
  isVerified: boolean;
  notes: string | null;
  uploadedAt: string;
  updatedAt: string;
}

/** GET /profile/me and /profile/employees/:id */
export interface Profile {
  id: string;
  email: string;
  role: Role;
  name: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  nidNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  createdAt: string;
  lastLogin: string | null;
  employeeProfile: {
    id: string;
    department: string | null;
    designation: string | null;
    joinDate: string | null;
    hourlyRate: Decimalish;
    dailyRate: Decimalish | null;
    payCalculationMode: PayCalculationMode;
    overtimeMultiplier: Decimalish;
  } | null;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  legalName: string | null;
  registrationNumber: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine: string | null;
  city: string | null;
  country: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------
export interface Permission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /permissions */
export interface PermissionCatalog {
  permissions: Permission[];
  /** Category code -> display label. */
  categories: Record<string, string>;
  /** Display label -> permissions in that category. */
  grouped: Record<string, Permission[]>;
  /** Preset name -> permission keys. */
  presets: Record<string, string[]>;
  defaultEmployeePermissions: string[];
}

export interface PermissionAuditEntry {
  id: string;
  action: string;
  permissionKey: string | null;
  performedBy?: UserRef | null;
  createdAt: string;
  details?: string | null;
}

/** GET /permissions/employees/:id */
export interface EmployeePermissions {
  user: { id: string; name: string | null; email: string; role: Role; isActive: boolean };
  /** Baseline every employee holds, not individually revocable. */
  defaultPermissions: string[];
  assignedPermissions: Permission[];
  explicitPermissionKeys: string[];
  effectivePermissions: string[];
  auditLogs: PermissionAuditEntry[];
}
