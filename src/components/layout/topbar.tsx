"use client";

import * as React from "react";

import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "./breadcrumb";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsMenu } from "./notifications-menu";
import { ProfileMenu } from "./profile-menu";
import { useUIStore } from "@/store/ui-store";
import { GlobalSearch, useGlobalSearchShortcut } from "@/features/search/global-search";

export function Topbar() {
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);
  const [searchOpen, setSearchOpen] = React.useState(false);

  useGlobalSearchShortcut(React.useCallback(() => setSearchOpen(true), []));

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

      {/* Opens the real search dialog; the bar itself is a button so it can
          never look like an input that does nothing. */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Search products, people, tasks and vendors"
        className="border-border bg-muted/60 text-muted-foreground hover:bg-muted focus-visible:border-primary focus-visible:ring-ring/30 ml-0 hidden h-9 max-w-sm flex-1 items-center gap-2 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none md:ml-4 md:flex"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Search…</span>
        <kbd className="bg-background text-muted-foreground ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] font-medium lg:inline">
          ⌘K
        </kbd>
      </button>

      {/* Mobile: icon only, same dialog. */}
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground md:hidden"
        onClick={() => setSearchOpen(true)}
        aria-label="Search"
      >
        <Search className="size-5" />
      </Button>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <NotificationsMenu />
        <div className="bg-border mx-1 hidden h-6 w-px sm:block" />
        <ProfileMenu />
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
