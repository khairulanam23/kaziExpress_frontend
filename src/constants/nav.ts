import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";

/** Every report a user could hold access to. */
const REPORT_PERMISSIONS = [
  PERMISSIONS.REPORT_INVENTORY,
  PERMISSIONS.REPORT_STOCK_MOVEMENTS,
  PERMISSIONS.REPORT_PRODUCTION,
  PERMISSIONS.REPORT_ATTENDANCE,
  PERMISSIONS.REPORT_PAYROLL,
  PERMISSIONS.REPORT_EMPLOYEE_PERFORMANCE,
  PERMISSIONS.REPORT_PROFIT,
] as const;
import type { NavItem } from "@/types";

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Navigation mirrors the backend's permission model rather than the coarse
 * ADMIN/EMPLOYEE role.
 *
 * Each destination declares the permission its landing endpoint requires
 * (`requirePermission(...)` on the matching route). A user granted, say, the
 * Inventory Manager preset is an EMPLOYEE but legitimately holds
 * INVENTORY_VIEW — under the previous role-only model the whole Inventory
 * section was hidden from them and the routes redirected away, denying access
 * the server had already granted.
 *
 * Items with no `permission` are open to any signed-in user.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      { label: "Notifications", href: "/dashboard/notifications", icon: "Bell" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Components", href: "/dashboard/components", icon: "Cpu", permission: PERMISSIONS.PRODUCT_VIEW },
      { label: "Products", href: "/dashboard/inventory", icon: "Boxes", permission: PERMISSIONS.PRODUCT_VIEW },
      { label: "Batches", href: "/dashboard/batches", icon: "Layers", permission: PERMISSIONS.INVENTORY_VIEW },
      {
        label: "Stock Movements",
        href: "/dashboard/stock-movements",
        icon: "ArrowLeftRight",
        permission: PERMISSIONS.INVENTORY_VIEW_MOVEMENTS,
      },
      { label: "Categories", href: "/dashboard/categories", icon: "Tag", permission: PERMISSIONS.CATEGORY_VIEW },
      { label: "Vendors", href: "/dashboard/vendors", icon: "Building2", permission: PERMISSIONS.VENDOR_VIEW },
    ],
  },
  {
    label: "Production",
    items: [
      { label: "Shopfloor", href: "/dashboard/shopfloor", icon: "LayoutGrid", permission: PERMISSIONS.PRODUCTION_VIEW },
      { label: "Tasks", href: "/dashboard/operations", icon: "Factory", permission: PERMISSIONS.PRODUCTION_VIEW },
      { label: "Requests", href: "/dashboard/refills", icon: "ClipboardList" },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        label: "Finished Goods",
        href: "/dashboard/finished-goods",
        icon: "PackageCheck",
        permission: PERMISSIONS.FINISHED_GOODS_VIEW,
      },
      { label: "Customers", href: "/dashboard/customers", icon: "Store", permission: PERMISSIONS.CUSTOMER_VIEW },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Employees", href: "/dashboard/employees", icon: "Users", permission: PERMISSIONS.EMPLOYEE_VIEW },
      { label: "Attendance", href: "/dashboard/attendance", icon: "CalendarCheck", permission: PERMISSIONS.ATTENDANCE_VIEW },
      { label: "Payroll", href: "/dashboard/payroll", icon: "Wallet", permission: PERMISSIONS.PAYROLL_VIEW },
      {
        label: "Permissions",
        href: "/dashboard/permissions",
        icon: "ShieldCheck",
        permission: PERMISSIONS.EMPLOYEE_MANAGE_PERMISSIONS,
      },
      {
        label: "Content Types",
        href: "/dashboard/employees/content-types",
        icon: "LayoutTemplate",
        adminOnly: true,
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        label: "Reports",
        href: "/dashboard/reports",
        icon: "PieChart",
        // Each report is separately permissioned; the hub is worth showing as
        // soon as one of them is reachable.
        anyOf: REPORT_PERMISSIONS,
      },
    ],
  },
];

export const NAV_FOOTER_ITEMS: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
  { label: "Profile", href: "/dashboard/profile", icon: "UserCircle" },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/**
 * Route-level access rules, keyed by path prefix.
 *
 * The guard mirrors the permission the page's primary endpoint enforces, so a
 * user is only redirected away from a page they genuinely cannot use. The
 * server remains authoritative; this only avoids showing a screen that would
 * be nothing but 403s.
 */
export interface RouteRule {
  prefix: string;
  permission?: PermissionKey | string;
  /** Page is usable if the user holds any one of these. */
  anyOf?: readonly string[];
  adminOnly?: boolean;
}

export const ROUTE_ACCESS: RouteRule[] = [
  { prefix: "/dashboard/reports", anyOf: REPORT_PERMISSIONS },
  { prefix: "/dashboard/inventory", permission: PERMISSIONS.PRODUCT_VIEW },
  { prefix: "/dashboard/components", permission: PERMISSIONS.PRODUCT_VIEW },
  { prefix: "/dashboard/batches", permission: PERMISSIONS.INVENTORY_VIEW },
  { prefix: "/dashboard/stock-movements", permission: PERMISSIONS.INVENTORY_VIEW_MOVEMENTS },
  { prefix: "/dashboard/categories", permission: PERMISSIONS.CATEGORY_VIEW },
  { prefix: "/dashboard/vendors", permission: PERMISSIONS.VENDOR_VIEW },
  { prefix: "/dashboard/shopfloor", permission: PERMISSIONS.PRODUCTION_VIEW },
  { prefix: "/dashboard/operations", permission: PERMISSIONS.PRODUCTION_VIEW },
  { prefix: "/dashboard/permissions", permission: PERMISSIONS.EMPLOYEE_MANAGE_PERMISSIONS },
  // Declared before /dashboard/employees so the more specific rule wins.
  { prefix: "/dashboard/employees/content-types", adminOnly: true },
  { prefix: "/dashboard/employees", permission: PERMISSIONS.EMPLOYEE_VIEW },
  { prefix: "/dashboard/attendance", permission: PERMISSIONS.ATTENDANCE_VIEW },
  { prefix: "/dashboard/payroll", permission: PERMISSIONS.PAYROLL_VIEW },
  { prefix: "/dashboard/finished-goods", permission: PERMISSIONS.FINISHED_GOODS_VIEW },
  { prefix: "/dashboard/customers", permission: PERMISSIONS.CUSTOMER_VIEW },
];

/** Most specific matching rule for a path, or undefined when unrestricted. */
export function routeRuleFor(pathname: string): RouteRule | undefined {
  return ROUTE_ACCESS.filter((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)).sort(
    (a, b) => b.prefix.length - a.prefix.length,
  )[0];
}

export function navGroupsFor(check: {
  isAdmin: boolean;
  has: (permission?: string | null) => boolean;
  hasAny: (permissions: readonly string[]) => boolean;
}): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.adminOnly && !check.isAdmin) return false;
      if (item.anyOf && !check.hasAny(item.anyOf)) return false;
      return check.has(item.permission);
    }),
  })).filter((group) => group.items.length > 0);
}
