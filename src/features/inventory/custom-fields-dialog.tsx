"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import { Loader2, Plus, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/states";
import { useRemoveProductCustomField, useSetProductCustomField } from "@/hooks/queries/use-products";
import { getApiErrorMessage } from "@/lib/api-client";
import { humanizeKey } from "@/lib/utils";
import type { Product } from "@/types";

/** Free-form key/value attributes stored on a product's `customFields` JSON column. */
export function CustomFieldsDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [newKey, setNewKey] = React.useState("");
  const [newValue, setNewValue] = React.useState("");

  const setField = useSetProductCustomField();
  const removeField = useRemoveProductCustomField();

  const entries = Object.entries(product.customFields ?? {});

  useResetOnOpen(open, () => {
      setNewKey("");
      setNewValue("");
  });

  const keyExists = entries.some(([k]) => k === newKey.trim());
  const canAdd = newKey.trim().length > 0 && !keyExists;

  const handleAdd = () =>
    setField.mutate(
      { id: product.id, key: newKey.trim(), value: newValue },
      {
        onSuccess: () => {
          toast.success("Field saved");
          setNewKey("");
          setNewValue("");
        },
        onError: (error) => toast.error("Couldn't save field", { description: getApiErrorMessage(error) }),
      },
    );

  const handleRemove = (key: string) =>
    removeField.mutate(
      { id: product.id, key },
      {
        onSuccess: () => toast.success("Field removed"),
        onError: (error) => toast.error("Couldn't remove field", { description: getApiErrorMessage(error) }),
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Custom fields</DialogTitle>
          <DialogDescription>Extra attributes stored against {product.name}.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {entries.length === 0 ? (
            <EmptyState icon={Tags} title="No custom fields" description="Add attributes specific to this item." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="text-sm font-medium">{humanizeKey(key)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm break-all">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(key)}
                          disabled={removeField.isPending}
                          aria-label={`Remove ${key}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
            <p className="text-sm font-medium">Add a field</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cf-key">Key *</Label>
                <Input
                  id="cf-key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g. warranty_months"
                />
                {keyExists && <p className="text-destructive text-xs">That key already exists.</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cf-value">Value</Label>
                <Input id="cf-value" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="e.g. 24" />
              </div>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={!canAdd || setField.isPending} className="self-start">
              {setField.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Save field
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
