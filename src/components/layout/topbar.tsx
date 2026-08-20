"use client";

import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "./breadcrumb";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsMenu } from "./notifications-menu";
import { ProfileMenu } from "./profile-menu";
import { useUIStore } from "@/store/ui-store";

export function Topbar() {
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);

  return (
    <header className="glass sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      <Breadcrumb />

      <div className="relative ml-0 hidden max-w-sm flex-1 md:ml-4 md:block">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search products, orders, employees…"
          className="border-border bg-muted/60 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-ring/30 h-9 w-full rounded-lg border pr-3 pl-9 text-sm outline-none transition-colors focus-visible:ring-2"
        />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <NotificationsMenu />
        <div className="bg-border mx-1 hidden h-6 w-px sm:block" />
        <ProfileMenu />
      </div>
    </header>
  );
}
