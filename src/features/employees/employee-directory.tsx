"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { CatalogGrid } from "@/components/shared/catalog-grid";
import { EmptyState } from "@/components/shared/states";
import { useDeactivateUser } from "@/hooks/queries/use-users";
import { getApiErrorMessage } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types";
import { EmployeeCard } from "./employee-card";
import { EmployeeDetailDrawer } from "./employee-detail-drawer";
import { EmployeeTable } from "./employee-table";

/**
 * The employee directory in whichever view is selected.
 *
 * Selection, deletion and the detail drawer live here rather than in either
 * view, so a card and a row open the same record and delete through the same
 * confirmation and mutation. The views below are presentational only.
 */
export function EmployeeDirectory({ employees, view }: { employees: User[]; view: "grid" | "list" }) {
  const deactivateUser = useDeactivateUser();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [selectedEmployee, setSelectedEmployee] = React.useState<User | null>(null);

  const handleDeactivate = (employee: User, event: React.MouseEvent) => {
    event.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to permanently delete user "${employee.name || employee.email}"? This will also remove their attendance and tasks from the database.`,
      )
    ) {
      return;
    }
    deactivateUser.mutate(employee.id, {
      onSuccess: () => {
        toast.success("User deleted", { description: `${employee.name ?? employee.email} was removed.` });
        queryClient.invalidateQueries({ queryKey: ["users"] });
      },
      onError: (error) => toast.error("Couldn't delete user", { description: getApiErrorMessage(error) }),
    });
  };

  if (employees.length === 0) {
    return <EmptyState icon={Users} title="No users found" description="Add your first user to get started." />;
  }

  return (
    <>
      {view === "grid" ? (
        <CatalogGrid>
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              canDelete={employee.id !== currentUser?.id}
              onSelect={setSelectedEmployee}
              onDelete={handleDeactivate}
            />
          ))}
        </CatalogGrid>
      ) : (
        <div className="overflow-x-auto">
          <EmployeeTable
            employees={employees}
            currentUserId={currentUser?.id}
            onSelect={setSelectedEmployee}
            onDelete={handleDeactivate}
          />
        </div>
      )}

      <EmployeeDetailDrawer
        employee={selectedEmployee}
        open={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
      />
    </>
  );
}
