/**
 * Permission keys mirrored from `src/config/permissions.ts` on the backend.
 *
 * These are UX controls only: they decide what a user is *offered*, never what
 * they are *allowed*. Every guarded endpoint re-checks the caller's effective
 * permissions server-side, so a stale or tampered client gains nothing.
 */
export const PERMISSIONS = {
  // Inventory
  INVENTORY_VIEW: "INVENTORY_VIEW",
  INVENTORY_CREATE: "INVENTORY_CREATE",
  INVENTORY_UPDATE: "INVENTORY_UPDATE",
  INVENTORY_DELETE: "INVENTORY_DELETE",
  INVENTORY_MANAGE_STOCK: "INVENTORY_MANAGE_STOCK",
  INVENTORY_MANAGE_BATCHES: "INVENTORY_MANAGE_BATCHES",
  INVENTORY_VIEW_MOVEMENTS: "INVENTORY_VIEW_MOVEMENTS",

  // Categories
  CATEGORY_VIEW: "CATEGORY_VIEW",
  CATEGORY_CREATE: "CATEGORY_CREATE",
  CATEGORY_UPDATE: "CATEGORY_UPDATE",
  CATEGORY_DELETE: "CATEGORY_DELETE",

  // Vendors
  VENDOR_VIEW: "VENDOR_VIEW",
  VENDOR_CREATE: "VENDOR_CREATE",
  VENDOR_UPDATE: "VENDOR_UPDATE",
  VENDOR_DELETE: "VENDOR_DELETE",

  // Products & BOM
  PRODUCT_VIEW: "PRODUCT_VIEW",
  PRODUCT_CREATE: "PRODUCT_CREATE",
  PRODUCT_UPDATE: "PRODUCT_UPDATE",
  PRODUCT_DELETE: "PRODUCT_DELETE",
  BOM_VIEW: "BOM_VIEW",
  BOM_CREATE: "BOM_CREATE",
  BOM_UPDATE: "BOM_UPDATE",
  BOM_DELETE: "BOM_DELETE",

  // Production
  PRODUCTION_VIEW: "PRODUCTION_VIEW",
  PRODUCTION_CREATE_TASK: "PRODUCTION_CREATE_TASK",
  PRODUCTION_ASSIGN_TASK: "PRODUCTION_ASSIGN_TASK",
  PRODUCTION_MANAGE_TASK: "PRODUCTION_MANAGE_TASK",
  PRODUCTION_REPORT: "PRODUCTION_REPORT",
  PRODUCTION_REPORT_DAMAGE: "PRODUCTION_REPORT_DAMAGE",
  PRODUCTION_MANAGE_REFILL: "PRODUCTION_MANAGE_REFILL",

  // Attendance & overtime
  ATTENDANCE_VIEW: "ATTENDANCE_VIEW",
  ATTENDANCE_VIEW_ALL: "ATTENDANCE_VIEW_ALL",
  ATTENDANCE_MANAGE: "ATTENDANCE_MANAGE",
  OVERTIME_VIEW: "OVERTIME_VIEW",
  OVERTIME_DECIDE: "OVERTIME_DECIDE",
  OVERTIME_OVERRIDE: "OVERTIME_OVERRIDE",

  // Payroll
  PAYROLL_VIEW: "PAYROLL_VIEW",
  PAYROLL_VIEW_ALL: "PAYROLL_VIEW_ALL",
  PAYROLL_MANAGE: "PAYROLL_MANAGE",
  PAYROLL_RECORD_PAYMENT: "PAYROLL_RECORD_PAYMENT",
  PAYROLL_UPDATE_RATE: "PAYROLL_UPDATE_RATE",
  PAYROLL_EXPORT: "PAYROLL_EXPORT",

  // Notifications
  NOTIFICATION_VIEW: "NOTIFICATION_VIEW",
  NOTIFICATION_MANAGE: "NOTIFICATION_MANAGE",

  // Reports
  REPORT_VIEW: "REPORT_VIEW",
  REPORT_INVENTORY: "REPORT_INVENTORY",
  REPORT_STOCK_MOVEMENTS: "REPORT_STOCK_MOVEMENTS",
  REPORT_PRODUCTION: "REPORT_PRODUCTION",
  REPORT_ATTENDANCE: "REPORT_ATTENDANCE",
  REPORT_PAYROLL: "REPORT_PAYROLL",
  REPORT_EMPLOYEE_PERFORMANCE: "REPORT_EMPLOYEE_PERFORMANCE",
  REPORT_EXPORT: "REPORT_EXPORT",

  // Dashboard
  DASHBOARD_VIEW: "DASHBOARD_VIEW",
  DASHBOARD_ADMIN_VIEW: "DASHBOARD_ADMIN_VIEW",

  // Employees & access control
  EMPLOYEE_VIEW: "EMPLOYEE_VIEW",
  EMPLOYEE_CREATE: "EMPLOYEE_CREATE",
  EMPLOYEE_UPDATE: "EMPLOYEE_UPDATE",
  EMPLOYEE_DELETE: "EMPLOYEE_DELETE",
  EMPLOYEE_MANAGE_PERMISSIONS: "EMPLOYEE_MANAGE_PERMISSIONS",

  // Sales & finished goods
  FINISHED_GOODS_VIEW: "FINISHED_GOODS_VIEW",
  SALES_RECORD: "SALES_RECORD",
  SALES_REVERSE: "SALES_REVERSE",
  SALES_SET_PRICE: "SALES_SET_PRICE",
  CUSTOMER_VIEW: "CUSTOMER_VIEW",
  CUSTOMER_MANAGE: "CUSTOMER_MANAGE",
  REPORT_PROFIT: "REPORT_PROFIT",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Icon + copy for each backend permission category, for the management UI. */
export const PERMISSION_CATEGORY_META: Record<string, { icon: string; blurb: string }> = {
  "Inventory Management": { icon: "Boxes", blurb: "Stock levels, batches and movement history" },
  "Category Management": { icon: "Tag", blurb: "Product categories" },
  "Vendor Management": { icon: "Building2", blurb: "Suppliers and their details" },
  "Products & Bill of Materials": { icon: "Package", blurb: "Catalogue items and their component recipes" },
  "Production & Task Management": { icon: "Factory", blurb: "Production tasks, reporting, damage and refills" },
  "Attendance & Overtime": { icon: "CalendarCheck", blurb: "Clock-ins, corrections and overtime decisions" },
  "Payroll & Salary Management": { icon: "Wallet", blurb: "Earnings, rates and salary payments" },
  Notifications: { icon: "Bell", blurb: "In-app alerts" },
  "Reports & Analytics": { icon: "PieChart", blurb: "Reporting and exports" },
  Dashboard: { icon: "LayoutDashboard", blurb: "Overview metrics" },
  "Employee & Access Control": { icon: "Users", blurb: "Staff records and who can do what" },
  "Sales & Finished Goods": { icon: "Store", blurb: "Selling what the floor produces, and to whom" },
};

/** Permissions that meaningfully widen a user's reach — flagged before saving. */
export const SENSITIVE_PERMISSIONS: string[] = [
  PERMISSIONS.EMPLOYEE_MANAGE_PERMISSIONS,
  // Reversing a sale rewrites recorded revenue, so it is held apart from
  // recording one.
  PERMISSIONS.SALES_REVERSE,
  PERMISSIONS.SALES_SET_PRICE,
  PERMISSIONS.EMPLOYEE_DELETE,
  PERMISSIONS.PAYROLL_RECORD_PAYMENT,
  PERMISSIONS.PAYROLL_UPDATE_RATE,
  PERMISSIONS.PAYROLL_VIEW_ALL,
  PERMISSIONS.INVENTORY_DELETE,
  PERMISSIONS.PRODUCT_DELETE,
  PERMISSIONS.OVERTIME_OVERRIDE,
];

/** Human labels for the backend's preset bundles. */
export const PRESET_META: Record<string, { label: string; blurb: string; icon: string }> = {
  NORMAL_EMPLOYEE: { label: "Normal employee", blurb: "Baseline access every employee already has", icon: "User" },
  INVENTORY_MANAGER: { label: "Inventory manager", blurb: "Full stock, category and vendor control", icon: "Boxes" },
  PRODUCTION_MANAGER: { label: "Production manager", blurb: "Create, assign and manage production tasks", icon: "Factory" },
  HR_MANAGER: { label: "HR manager", blurb: "Employee records, attendance and overtime", icon: "Users" },
  PAYROLL_MANAGER: { label: "Payroll manager", blurb: "Payroll, rates and salary payments", icon: "Wallet" },
  OPERATIONS_MANAGER: { label: "Operations manager", blurb: "Inventory plus production oversight", icon: "Settings2" },
  SALES_MANAGER: { label: "Sales manager", blurb: "Sell finished goods, set prices and manage customers", icon: "Store" },
  FULL_ACCESS_EMPLOYEE: { label: "Full access", blurb: "Everything an administrator can do", icon: "ShieldCheck" },
};
