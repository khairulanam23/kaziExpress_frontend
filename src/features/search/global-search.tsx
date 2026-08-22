"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2, CornerDownLeft, Factory, Loader2, Package, Search, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserAvatar, ProductThumb } from "@/components/shared/initials-avatar";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { productsService } from "@/services/products.service";
import { usersService } from "@/services/users.service";
import { tasksService } from "@/services/tasks.service";
import { vendorsService } from "@/services/vendors.service";
import { taskProgress } from "@/lib/calc";
import { cn, formatPercent, formatQuantity } from "@/lib/utils";

interface Hit {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
}

/** Debounces the typed term so a search fires per pause, not per keystroke. */
function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Cross-entity search.
 *
 * Only the entities the user can actually open are queried — searching
 * employees with no EMPLOYEE_VIEW would just produce 403s — and results are
 * grouped by type so the answer is scannable rather than a flat list.
 */
export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { has } = usePermissions();
  const [term, setTerm] = React.useState("");
  const [cursor, setCursor] = React.useState(0);
  const debounced = useDebounced(term.trim());
  const enabled = open && debounced.length >= 2;

  const canProducts = has(PERMISSIONS.PRODUCT_VIEW);
  const canEmployees = has(PERMISSIONS.EMPLOYEE_VIEW);
  const canTasks = has(PERMISSIONS.PRODUCTION_VIEW);
  const canVendors = has(PERMISSIONS.VENDOR_VIEW);

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ["global-search", debounced, canProducts, canEmployees, canTasks, canVendors],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<Hit[]> => {
      const results = await Promise.allSettled([
        canProducts ? productsService.list({ search: debounced, showPerPage: 5 }) : null,
        canEmployees ? usersService.list({ search: debounced, showPerPage: 5 }) : null,
        canTasks ? tasksService.list({ showPerPage: 40 }) : null,
        canVendors ? vendorsService.list({ searchKey: debounced, showPerPage: 5 }) : null,
      ]);

      const out: Hit[] = [];
      const lower = debounced.toLowerCase();

      const [products, users, tasks, vendors] = results;

      if (products.status === "fulfilled" && products.value) {
        for (const p of products.value.products.slice(0, 5)) {
          out.push({
            id: `product-${p.id}`,
            group: "Products",
            title: p.name,
            subtitle: `${p.sku ?? "No SKU"} · ${formatQuantity(p.currentStock, p.unit)} in stock`,
            href: p.itemType === "COMPONENT" ? "/dashboard/components" : "/dashboard/inventory",
            icon: <ProductThumb name={p.name} imageUrl={p.imageUrl} size="size-8" className="rounded-lg" />,
          });
        }
      }

      if (users.status === "fulfilled" && users.value) {
        for (const u of users.value.users.slice(0, 5)) {
          out.push({
            id: `user-${u.id}`,
            group: "Employees",
            title: u.name ?? u.email,
            subtitle: u.employeeProfile?.designation ?? u.employeeProfile?.department ?? u.email,
            href: "/dashboard/employees",
            icon: <UserAvatar name={u.name ?? u.email} imageUrl={u.avatarUrl} size="size-8" />,
            meta: <Badge variant={u.isActive ? "success" : "muted"}>{u.isActive ? "Active" : "Inactive"}</Badge>,
          });
        }
      }

      // The tasks endpoint has no search parameter, so filter client-side over
      // a recent page rather than inventing a query the API doesn't accept.
      if (tasks.status === "fulfilled" && tasks.value) {
        const matched = tasks.value.tasks
          .filter(
            (t) =>
              t.title.toLowerCase().includes(lower) ||
              (t.product?.name ?? "").toLowerCase().includes(lower),
          )
          .slice(0, 5);
        for (const t of matched) {
          const progress = taskProgress(t);
          out.push({
            id: `task-${t.id}`,
            group: "Production tasks",
            title: t.title,
            subtitle: `${t.product?.name ?? "No product"} · ${formatPercent(progress.completionPercentage)} complete`,
            href: "/dashboard/shopfloor",
            icon: (
              <span className="bg-primary-soft text-primary flex size-8 items-center justify-center rounded-lg">
                <Factory className="size-4" />
              </span>
            ),
          });
        }
      }

      if (vendors.status === "fulfilled" && vendors.value) {
        for (const v of vendors.value.vendors.slice(0, 4)) {
          out.push({
            id: `vendor-${v.id}`,
            group: "Vendors",
            title: v.name,
            subtitle: v.email ?? v.phone ?? "No contact details",
            href: "/dashboard/vendors",
            icon: (
              <span className="bg-secondary-soft text-secondary flex size-8 items-center justify-center rounded-lg">
                <Building2 className="size-4" />
              </span>
            ),
          });
        }
      }

      return out;
    },
  });

  // Keep the highlighted row in range as results change.
  const safeCursor = Math.min(cursor, Math.max(0, hits.length - 1));

  const go = React.useCallback(
    (hit: Hit) => {
      onOpenChange(false);
      setTerm("");
      router.push(hit.href);
    },
    [onOpenChange, router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[safeCursor]);
    }
  };

  const grouped = React.useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const h of hits) {
      if (!map.has(h.group)) map.set(h.group, []);
      map.get(h.group)!.push(h);
    }
    return map;
  }, [hits]);

  let running = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-24 max-h-[70vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search products, employees, production tasks and vendors.
        </DialogDescription>

        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <input
            autoFocus
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search products, people, tasks, vendors…"
            aria-label="Search"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isFetching && <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />}
        </div>

        <div className="thin-scrollbar max-h-96 overflow-y-auto p-2">
          {debounced.length < 2 ? (
            <p className="text-muted-foreground px-3 py-8 text-center text-sm">
              Type at least two characters to search.
            </p>
          ) : hits.length === 0 && !isFetching ? (
            <p className="text-muted-foreground px-3 py-8 text-center text-sm">
              Nothing matched <span className="text-foreground font-medium">{debounced}</span>.
            </p>
          ) : (
            [...grouped.entries()].map(([group, items]) => (
              <div key={group} className="mb-2 last:mb-0">
                <p className="text-muted-foreground px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase">
                  {group}
                </p>
                <ul>
                  {items.map((hit) => {
                    running += 1;
                    const active = running === safeCursor;
                    return (
                      <li key={hit.id}>
                        <button
                          type="button"
                          onClick={() => go(hit)}
                          onMouseEnter={() => setCursor(hits.indexOf(hit))}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                            active ? "bg-primary-soft" : "hover:bg-muted",
                          )}
                        >
                          {hit.icon}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{hit.title}</span>
                            <span className="text-muted-foreground block truncate text-xs">{hit.subtitle}</span>
                          </span>
                          {hit.meta}
                          {active && <CornerDownLeft className="text-muted-foreground size-3.5 shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="text-muted-foreground flex items-center gap-3 border-t border-border px-4 py-2 text-[11px]">
          <span>↑↓ to navigate</span>
          <span>↵ to open</span>
          <span>esc to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Opens global search on ⌘K / Ctrl-K from anywhere in the shell. */
export function useGlobalSearchShortcut(onOpen: () => void) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}

export { Package, Users };
