"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, LogOut, ChevronsLeft, ChevronsRight, Sparkles } from "lucide-react";
import { navGroupsForRole, NAV_FOOTER_ITEMS } from "@/constants/nav";
import { ICON_MAP } from "@/constants/icon-map";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useLogout } from "@/hooks/queries/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { useUnreadNotificationCount } from "@/hooks/queries/use-notifications";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/employees") {
    return pathname.startsWith(href) && !pathname.startsWith("/dashboard/employees/content-types");
  }
  return pathname.startsWith(href);
}

function NavLink({
  href,
  icon,
  label,
  collapsed,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  icon: string;
  label: string;
  collapsed: boolean;
  active: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const Icon = ICON_MAP[icon] ?? LayoutDashboard;

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <motion.span
          layoutId="active-nav-pill"
          className="absolute inset-0 rounded-xl bg-primary -z-10"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <Icon className={cn("size-4.5 shrink-0 transition-transform duration-200", active && "scale-105")} />
      {!collapsed && <span className="truncate">{label}</span>}
      {!!badge && badge > 0 && (
        <span
          className={cn(
            "tabular ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
            active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive text-destructive-foreground",
            collapsed && "absolute top-1 right-1 h-4 min-w-4 px-1",
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function SidebarContent({
  collapsed,
  onNavigate,
  showCollapseToggle = true,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  showCollapseToggle?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSettled: () => router.replace("/login") });
  };

  const user = useAuthStore((s) => s.user);
  const { data: unreadCount } = useUnreadNotificationCount();

  // Employees only ever see destinations their role is authorized for.
  const filteredGroups = navGroupsForRole(user?.role);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn("flex h-16 shrink-0 items-center gap-3 px-4 border-b border-sidebar-border", collapsed && "justify-center px-0")}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-accent text-primary-foreground shadow-md shadow-primary/30">
          <Sparkles className="size-4" />
        </span>
        {!collapsed && (
          <div>
            <span className="text-base font-bold tracking-tight text-foreground">Inventory Management</span>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Inventory System</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3 thin-scrollbar">
        {filteredGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  badge={item.href === "/dashboard/notifications" ? unreadCount : undefined}
                  collapsed={collapsed}
                  active={isActive(pathname, item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}

        <div className={cn("mt-auto pt-3 border-t border-sidebar-border", collapsed && "mx-1")} />

        {NAV_FOOTER_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            collapsed={collapsed}
            active={isActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Footer: Logout + Collapse */}
      <div className={cn("flex shrink-0 flex-col gap-1 border-t border-sidebar-border px-3 py-3", collapsed && "items-center px-1")}>
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive w-full",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="size-4.5 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>

        {showCollapseToggle && (
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground w-full",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <ChevronsRight className="size-4 shrink-0" /> : <ChevronsLeft className="size-4 shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </div>
  );
}
