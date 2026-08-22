import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { VendorsTable } from "@/features/vendors/vendors-table";

export const metadata: Metadata = { title: "Vendors — Kazi Express" };

export default function VendorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary-soft text-secondary">
          <Building2 className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Vendor Management</h1>
          <p className="text-sm text-muted-foreground">Manage your suppliers and vendors</p>
        </div>
      </div>
      <VendorsTable />
    </div>
  );
}
