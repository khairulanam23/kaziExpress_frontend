import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { CategoriesTable } from "@/features/categories/categories-table";

export const metadata: Metadata = { title: "Categories — Inventory Management" };

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Tag className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Category Management</h1>
          <p className="text-sm text-muted-foreground">Organize your products into categories</p>
        </div>
      </div>
      <CategoriesTable />
    </div>
  );
}
