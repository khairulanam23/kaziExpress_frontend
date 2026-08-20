"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/queries/use-categories";
import { getApiErrorMessage } from "@/lib/api-client";
import type { Category } from "@/services/categories.service";

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
}) {
  const isEdit = !!category;
  const [name, setName] = React.useState(category?.name ?? "");
  const [description, setDescription] = React.useState(category?.description ?? "");
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const loading = createCategory.isPending || updateCategory.isPending;

  useResetOnOpen(open, () => {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Category name is required"); return; }

    const onSuccess = () => {
      toast.success(isEdit ? "Category updated" : "Category created");
      onOpenChange(false);
    };
    const onError = (error: unknown) => toast.error("Error", { description: getApiErrorMessage(error) });

    if (isEdit && category) {
      updateCategory.mutate({ id: category.id, payload: { name, description: description || undefined } }, { onSuccess, onError });
    } else {
      createCategory.mutate({ name, description: description || undefined }, { onSuccess, onError });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update the category details." : "Add a new product category."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" placeholder="e.g. Electronics" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="cat-desc" placeholder="Short description..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CategoriesTable() {
  const [search, setSearch] = React.useState("");
  const [editCategory, setEditCategory] = React.useState<Category | undefined>();
  const [editOpen, setEditOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data, isLoading } = useCategories({ searchKey: search || undefined });
  const deleteCategory = useDeleteCategory();

  const categories = data?.categories ?? [];

  const handleDelete = (id: string, name: string) => {
    deleteCategory.mutate(id, {
      onSuccess: () => toast.success(`"${name}" deleted`),
      onError: (error) => toast.error("Error", { description: getApiErrorMessage(error) }),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search categories..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New category
        </Button>
      </div>

      <CategoryFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CategoryFormDialog open={editOpen} onOpenChange={setEditOpen} category={editCategory} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Tag className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No categories yet</p>
            <p className="text-xs text-muted-foreground">Create your first category to organize products.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Products</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cat.description || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge-primary">{cat._count?.products ?? 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => { setEditCategory(cat); setEditOpen(true); }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8 text-destructive hover:bg-destructive-soft">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete category?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete &quot;{cat.name}&quot;. Products using this category will become uncategorized.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(cat.id, cat.name)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
