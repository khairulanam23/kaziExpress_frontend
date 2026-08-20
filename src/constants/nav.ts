import type { NavItem, Role } from "@/types";

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Navigation mirrors the backend's authorization model: anything marked
 * `adminOnly` maps to a route whose endpoints are guarded by
 * `checkRoles('ADMIN')` server-side. Hiding it is a convenience — the guard in
 * `ROUTE_ACCESS` and the API itself are what actually enforce it.
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
      { label: "Components", href: "/dashboard/components", icon: "Cpu", adminOnly: true },
      { label: "Products", href: "/dashboard/inventory", icon: "Boxes", adminOnly: true },
      { label: "Batches", href: "/dashboard/batches", icon: "Layers", adminOnly: true },
      { label: "Stock Movements", href: "/dashboard/stock-movements", icon: "ArrowLeftRight", adminOnly: true },
      { label: "Categories", href: "/dashboard/categories", icon: "Tag", adminOnly: true },
      { label: "Vendors", href: "/dashboard/vendors", icon: "Building2", adminOnly: true },
    ],
  },
  {
    label: "Production",
    items: [
      { label: "Tasks", href: "/dashboard/operations", icon: "Factory" },
      { label: "Requests", href: "/dashboard/refills", icon: "ClipboardList" },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Employees", href: "/dashboard/employees", icon: "Users", adminOnly: true },
      { label: "Attendance", href: "/dashboard/attendance", icon: "CalendarCheck" },
      { label: "Payroll", href: "/dashboard/payroll", icon: "Wallet" },
      { label: "Content Types", href: "/dashboard/employees/content-types", icon: "LayoutTemplate", adminOnly: true },
    ],
  },
  {
    label: "Insights",
    items: [{ label: "Reports", href: "/dashboard/reports", icon: "PieChart" }],
  },
];

export const NAV_FOOTER_ITEMS: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
  { label: "Profile", href: "/dashboard/profile", icon: "UserCircle" },
];

/** Flat list, kept for any consumer that wants every destination. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/**
 * Route prefixes whose *pages* are admin-only. Employees who land on one —
 * by typing the URL or following a stale link — are redirected to their
 * dashboard, and every request those pages would make is rejected with 403
 * by the API regardless.
 */
export const ADMIN_ONLY_ROUTES: string[] = [
  "/dashboard/inventory",
  "/dashboard/components",
  "/dashboard/batches",
  "/dashboard/stock-movements",
  "/dashboard/categories",
  "/dashboard/vendors",
  "/dashboard/employees",
];

export function isAdminOnlyRoute(pathname: string): boolean {
  return ADMIN_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function navGroupsForRole(role: Role | undefined): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => role === "ADMIN" || !item.adminOnly),
  })).filter((group) => group.items.length > 0);
}
