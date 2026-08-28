"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { SectionHeader, ChartCard } from "@/components/shared/chart-card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/shared/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogGrid } from "@/components/shared/catalog-grid";
import { ViewToggle } from "@/components/shared/view-toggle";

import { useUsers } from "@/hooks/queries/use-users";
import { EmployeeOverviewCards } from "@/features/employees/overview-cards";
import { EmployeeDirectory } from "@/features/employees/employee-directory";
import { EmployeeCardSkeleton } from "@/features/employees/employee-card";
import { CreateEmployeeDialog } from "@/features/employees/create-employee-dialog";

const PAGE_SIZE = 8;

export default function EmployeesPage() {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  // People have photographs, so the directory leads with them; the table
  // stays for comparing pay rates and departments down a column.
  const [view, setView] = React.useState<"grid" | "list">("grid");

  const { data, isLoading } = useUsers({ search: search || undefined, pageNo: page, showPerPage: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Employee information"
        description="Workforce overview, pay rates, and attendance."
        action={<CreateEmployeeDialog />}
      />

      <EmployeeOverviewCards />

      <ChartCard title="All employees" description="Search and manage your workforce">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search by name or email…"
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <ViewToggle view={view} onViewChange={setView} className="ml-auto" />
        </div>

        {isLoading ? (
          view === "grid" ? (
            <CatalogGrid>
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <EmployeeCardSkeleton key={i} />
              ))}
            </CatalogGrid>
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          )
        ) : (
          <>
            <EmployeeDirectory employees={data?.users ?? []} view={view} />
            <div className="mt-2">
              <Pagination page={page} pageCount={data?.totalPages ?? 1} onPageChange={setPage} totalItems={data?.totalData ?? 0} pageSize={PAGE_SIZE} />
            </div>
          </>
        )}
      </ChartCard>
    </div>
  );
}
