"use client";

import { motion } from "framer-motion";
import { useUIStore } from "@/store/ui-store";
import { SidebarContent } from "./sidebar-content";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function DesktopSidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="bg-card sticky top-0 hidden h-screen shrink-0 border-r border-border lg:block"
    >
      <SidebarContent collapsed={collapsed} />
    </motion.aside>
  );
}

export function MobileSidebar() {
  const open = useUIStore((s) => s.mobileNavOpen);
  const setOpen = useUIStore((s) => s.setMobileNavOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <VisuallyHidden>
          <SheetTitle>Navigation</SheetTitle>
        </VisuallyHidden>
        <SidebarContent collapsed={false} onNavigate={() => setOpen(false)} showCollapseToggle={false} />
      </SheetContent>
    </Sheet>
  );
}
