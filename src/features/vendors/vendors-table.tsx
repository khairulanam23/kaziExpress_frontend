"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Building2, Loader2, Search, Phone, Mail, MapPin } from "lucide-react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComp, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from "@/hooks/queries/use-vendors";
import { getApiErrorMessage } from "@/lib/api-client";
import type { Vendor } from "@/types";

function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor;
}) {
  const isEdit = !!vendor;
  const [form, setForm] = React.useState({
    name: vendor?.name ?? "",
    contact: vendor?.contact ?? "",
    phone: vendor?.phone ?? "",
    email: vendor?.email ?? "",
    address: vendor?.address ?? "",
    notes: vendor?.notes ?? "",
  });

  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const loading = createVendor.isPending || updateVendor.isPending;
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useResetOnOpen(open, () =>
    setForm({
      name: vendor?.name ?? "",
      contact: vendor?.contact ?? "",
      phone: vendor?.phone ?? "",
      email: vendor?.email ?? "",
      address: vendor?.address ?? "",
      notes: vendor?.notes ?? "",
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Vendor name is required"); return; }
    const payload = {
      name: form.name,
      contact: form.contact || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
    };
    const onSuccess = () => {
      toast.success(isEdit ? "Vendor updated" : "Vendor created");
      onOpenChange(false);
    };
    const onError = (error: unknown) => toast.error("Error", { description: getApiErrorMessage(error) });

    if (isEdit && vendor) {
      updateVendor.mutate({ id: vendor.id, payload }, { onSuccess, onError });
    } else {
      createVendor.mutate(payload, { onSuccess, onError });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit vendor" : "Add vendor"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update vendor information." : "Add a new supplier or vendor."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ven-name">Name *</Label>
            <Input id="ven-name" placeholder="Acme Supplies Ltd." value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ven-contact">Contact person</Label>
              <Input id="ven-contact" placeholder="John Doe" value={form.contact} onChange={(e) => set("contact", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ven-phone">Phone</Label>
              <Input id="ven-phone" placeholder="+1 234 567 8901" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ven-email">Email</Label>
            <Input id="ven-email" type="email" placeholder="vendor@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ven-address">Address</Label>
            <Input id="ven-address" placeholder="123 Main St, City" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ven-notes">Notes</Label>
            <Input id="ven-notes" placeholder="Additional notes..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VendorsTable() {
  const [search, setSearch] = React.useState("");
  const [editVendor, setEditVendor] = React.useState<Vendor | undefined>();
  const [editOpen, setEditOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data, isLoading } = useVendors({ searchKey: search || undefined });
  const deleteVendor = useDeleteVendor();
  const vendors = data?.vendors ?? [];

  const handleDelete = (id: string, name: string) => {
    deleteVendor.mutate(id, {
      onSuccess: () => toast.success(`"${name}" deleted`),
      onError: (error) => toast.error("Error", { description: getApiErrorMessage(error) }),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Add vendor
        </Button>
      </div>

      <VendorFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <VendorFormDialog open={editOpen} onOpenChange={setEditOpen} vendor={editVendor} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Building2 className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No vendors yet</p>
            <p className="text-xs text-muted-foreground">Add your first vendor to link with products.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Contact</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Details</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{v.name}</p>
                    {v.isActive === false && <span className="badge-destructive mt-1">Inactive</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{v.contact || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {v.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" />{v.phone}</span>}
                      {v.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="size-3" />{v.email}</span>}
                      {v.address && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{v.address}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => { setEditVendor(v); setEditOpen(true); }}>
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
                            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              &quot;{v.name}&quot; will be removed. Products linked to this vendor will be unlinked.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooterComp>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(v.id, v.name)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooterComp>
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
