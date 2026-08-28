"use client";

import * as React from "react";
import { toast } from "sonner";
import { Building2, Loader2, Plus, Search, Store, Trash2, User, Users } from "lucide-react";
import { SectionHeader } from "@/components/shared/chart-card";
import { PermissionGate } from "@/components/shared/permission-gate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import { useCreateCustomer, useCustomers, useDeleteCustomer, useUpdateCustomer } from "@/hooks/queries/use-sales";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";
import type { Customer, CustomerType } from "@/types";

/**
 * The customer directory.
 *
 * Buyers are records rather than typed-in names so that profit per customer is
 * answerable — free text fragments on spelling and the report becomes noise.
 */

const TYPE_META: Record<CustomerType, { label: string; icon: typeof User; blurb: string }> = {
  RETAIL: { label: "Retail", icon: User, blurb: "Individual buyers" },
  WHOLESALE: { label: "Wholesale", icon: Building2, blurb: "Trade buyers, usually in volume" },
  OWN_STORE: { label: "Own store", icon: Store, blurb: "Your own outlet" },
};

function CustomerDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!customer;
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CustomerType>("RETAIL");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const pending = create.isPending || update.isPending;

  // Seed the form during render when the target changes, so it never shows the
  // previous customer for a frame.
  const [lastKey, setLastKey] = React.useState<string | null>(null);
  const key = open ? (customer?.id ?? "new") : null;
  if (key !== lastKey) {
    setLastKey(key);
    setName(customer?.name ?? "");
    setType(customer?.type ?? "RETAIL");
    setPhone(customer?.phone ?? "");
    setEmail(customer?.email ?? "");
    setAddress(customer?.address ?? "");
    setNotes(customer?.notes ?? "");
    setIsActive(customer?.isActive ?? true);
    setFieldErrors({});
  }

  const submit = async () => {
    setFieldErrors({});
    const payload = {
      name: name.trim(),
      type,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
      ...(isEdit ? { isActive } : {}),
    };
    try {
      if (isEdit) await update.mutateAsync({ id: customer!.id, payload });
      else await create.mutateAsync(payload);
      toast.success(isEdit ? "Customer updated" : `${payload.name} added`);
      onOpenChange(false);
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      toast.error("Couldn't save that customer", { description: getApiErrorMessage(error) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit customer" : "Add a customer"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-name">Name</Label>
            <Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!fieldErrors.name} />
            {fieldErrors.name && <p className="text-destructive text-xs">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CustomerType)}>
              <SelectTrigger id="customer-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_META) as CustomerType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_META[t].label}
                    <span className="text-muted-foreground ml-2 text-xs">{TYPE_META[t].blurb}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input id="customer-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customer-email">Email</Label>
              <Input id="customer-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fieldErrors.email} />
              {fieldErrors.email && <p className="text-destructive text-xs">{fieldErrors.email}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-address">Address</Label>
            <Input id="customer-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-notes">Notes</Label>
            <Textarea id="customer-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <Switch id="customer-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="customer-active" className="text-sm">
                Active — inactive customers cannot be chosen for new sales
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || pending}>
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            {isEdit ? "Save changes" : "Add customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState<Customer | null>(null);

  const { data, isLoading, isError, error, refetch } = useCustomers({
    search: search.trim() || undefined,
    includeInactive,
  });
  const remove = useDeleteCustomer();

  const customers = data?.customers ?? [];

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      const hadHistory = (removing._count?.dispositions ?? 0) > 0;
      await remove.mutateAsync(removing.id);
      toast.success(hadHistory ? `${removing.name} deactivated` : `${removing.name} removed`, {
        description: hadHistory
          ? "They have sales history, so the record is kept and hidden from new sales."
          : undefined,
      });
      setRemoving(null);
    } catch (err) {
      toast.error("Couldn't remove that customer", { description: getApiErrorMessage(err) });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Customers" description="Who you sell finished goods to, including your own outlets." />

      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="customer-search" className="text-muted-foreground text-xs">
                Search
              </Label>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" aria-hidden />
                <Input
                  id="customer-search"
                  className="h-9 w-56 pl-8"
                  placeholder="Name, phone or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch id="show-inactive" checked={includeInactive} onCheckedChange={setIncludeInactive} />
              <Label htmlFor="show-inactive" className="text-sm">
                Show inactive
              </Label>
            </div>
          </div>

          <PermissionGate permission={PERMISSIONS.CUSTOMER_MANAGE}>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              Add customer
            </Button>
          </PermissionGate>
        </div>

        {isLoading && <TableSkeleton rows={5} />}
        {isError && <ErrorState error={error} onRetry={refetch} />}

        {data && customers.length === 0 && (
          <EmptyState
            icon={Users}
            title={search ? "No customers match that" : "No customers yet"}
            description={
              search
                ? "Try a different name, phone number or email."
                : "Add the businesses and outlets you sell to, so each sale can be attributed and profit per customer becomes answerable."
            }
          />
        )}

        {data && customers.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const meta = TYPE_META[c.type];
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{c.name}</span>
                          {!c.isActive && <Badge variant="muted">Inactive</Badge>}
                        </div>
                        {c.address && <p className="text-muted-foreground text-xs">{c.address}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <meta.icon />
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.phone && <p>{c.phone}</p>}
                        {c.email && <p className="text-muted-foreground text-xs">{c.email}</p>}
                        {!c.phone && !c.email && <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="tabular text-right text-sm">
                        {formatNumber(c._count?.dispositions ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <PermissionGate permission={PERMISSIONS.CUSTOMER_MANAGE}>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(c);
                                setDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button size="icon" variant="ghost" className="size-8" onClick={() => setRemoving(c)} aria-label={`Remove ${c.name}`}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </PermissionGate>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <CustomerDialog customer={editing} open={dialogOpen} onOpenChange={setDialogOpen} />

      <AlertDialog open={!!removing} onOpenChange={(open: boolean) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name ?? "this customer"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {(removing?._count?.dispositions ?? 0) > 0
                ? "They have sales history, so the record will be deactivated rather than deleted — past sales keep their buyer."
                : "They have no sales history, so the record will be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={remove.isPending}>
              {remove.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
