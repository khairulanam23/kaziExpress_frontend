"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import { Loader2, PackagePlus, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAddStock, useAdjustStock, useBatches } from "@/hooks/queries/use-inventory";
import { useProducts } from "@/hooks/queries/use-products";
import { getApiErrorMessage } from "@/lib/api-client";
import { batchAvailable, num, round } from "@/lib/calc";
import { formatMoney, formatQuantity } from "@/lib/utils";

/** Adds stock, which always opens a new inventory batch server-side. */
export function AddStockDialog({ productId, trigger }: { productId?: string; trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState(productId ?? "");
  const [quantity, setQuantity] = React.useState("");
  const [unitCost, setUnitCost] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const addStock = useAddStock();
  const { data: productsData } = useProducts({ isDiscontinued: false, showPerPage: 200 }, { enabled: open && !productId });

  const products = productsData?.products ?? [];
  const product = products.find((p) => p.id === selectedProduct);

  useResetOnOpen(open, () => {
      setSelectedProduct(productId ?? "");
      setQuantity("");
      setUnitCost("");
      setNotes("");
  });

  const qty = Number(quantity);
  const qtyValid = Number.isFinite(qty) && qty > 0;
  const cost = unitCost === "" ? undefined : Number(unitCost);
  const costValid = cost === undefined || (Number.isFinite(cost) && cost >= 0);

  const effectiveCost = cost ?? num(product?.unitPrice);
  const totalCost = qtyValid ? round(qty * effectiveCost) : 0;
  const newStock = qtyValid && product ? round(num(product.currentStock) + qty, 3) : null;

  const handleSubmit = () =>
    addStock.mutate(
      { productId: selectedProduct, quantity: qty, unitCost: cost, notes: notes.trim() || undefined },
      {
        onSuccess: (result) => {
          toast.success("Stock added", { description: `Batch ${result.batch?.batchNumber ?? ""} created.` });
          setOpen(false);
        },
        onError: (error) => toast.error("Couldn't add stock", { description: getApiErrorMessage(error) }),
      },
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PackagePlus className="size-4" />
            Add stock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add stock</DialogTitle>
          <DialogDescription>Records a purchase and opens a new inventory batch.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!productId && (
            <div className="flex flex-col gap-1.5">
              <Label>Item *</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.sku ? ` · ${p.sku}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-qty">Quantity *</Label>
              <Input
                id="add-qty"
                type="number"
                min={0.001}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-cost">Unit cost</Label>
              <Input
                id="add-cost"
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                placeholder={product ? String(num(product.unitPrice)) : "Item price"}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>

          {quantity !== "" && !qtyValid && <p className="text-destructive text-xs">Quantity must be greater than 0.</p>}
          {!costValid && <p className="text-destructive text-xs">Unit cost can&apos;t be negative.</p>}

          {product && qtyValid && (
            <div className="bg-muted/40 flex flex-col gap-1.5 rounded-xl p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current stock</span>
                <span className="tabular">{formatQuantity(product.currentStock, product.unit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">After this purchase</span>
                <Badge variant="success">{formatQuantity(newStock ?? 0, product.unit)}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total cost</span>
                <span className="tabular font-medium">{formatMoney(totalCost)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-notes">Notes</Label>
            <Textarea
              id="add-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. PO #4471 from Acme Supplies"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={addStock.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedProduct || !qtyValid || !costValid || addStock.isPending}>
            {addStock.isPending ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
            Add stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Manual stock correction — absolute target or signed delta, reason required. */
export function AdjustStockDialog({ productId, trigger }: { productId?: string; trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"absolute" | "delta">("absolute");
  const [selectedProduct, setSelectedProduct] = React.useState(productId ?? "");
  const [value, setValue] = React.useState("");
  const [batchId, setBatchId] = React.useState("");
  const [reason, setReason] = React.useState("");

  const adjustStock = useAdjustStock();
  const { data: productsData } = useProducts({ isDiscontinued: false, showPerPage: 200 }, { enabled: open && !productId });
  const { data: batches = [] } = useBatches(selectedProduct || undefined, { enabled: open && !!selectedProduct });

  const products = productsData?.products ?? [];
  const product = products.find((p) => p.id === selectedProduct);

  useResetOnOpen(open, () => {
      setSelectedProduct(productId ?? "");
      setValue("");
      setBatchId("");
      setReason("");
      setMode("absolute");
  });

  const parsed = Number(value);
  const numeric = value !== "" && Number.isFinite(parsed);
  const current = num(product?.currentStock);
  const target = mode === "absolute" ? parsed : round(current + parsed, 3);
  const delta = round(target - current, 3);
  const goesNegative = numeric && target < 0;
  const noChange = numeric && delta === 0;

  const handleSubmit = () =>
    adjustStock.mutate(
      {
        productId: selectedProduct,
        ...(mode === "absolute" ? { newQuantity: parsed } : { quantityDifference: parsed }),
        batchId: delta < 0 && batchId ? batchId : undefined,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Inventory adjusted");
          setOpen(false);
        },
        onError: (error) => toast.error("Couldn't adjust inventory", { description: getApiErrorMessage(error) }),
      },
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <SlidersHorizontal className="size-4" />
            Adjust stock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust inventory</DialogTitle>
          <DialogDescription>Correct a stock figure. Every adjustment is recorded with its reason.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!productId && (
            <div className="flex flex-col gap-1.5">
              <Label>Item *</Label>
              <Select
                value={selectedProduct}
                onValueChange={(v) => {
                  setSelectedProduct(v);
                  setBatchId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.sku ? ` · ${p.sku}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Tabs value={mode} onValueChange={(v) => setMode(v as "absolute" | "delta")}>
            <TabsList className="w-full">
              <TabsTrigger value="absolute" className="flex-1">
                Set to
              </TabsTrigger>
              <TabsTrigger value="delta" className="flex-1">
                Add / remove
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-value">{mode === "absolute" ? "New quantity *" : "Change (+/−) *"}</Label>
            <Input
              id="adjust-value"
              type="number"
              step="any"
              min={mode === "absolute" ? 0 : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === "absolute" ? "e.g. 120" : "e.g. -5"}
            />
          </div>

          {product && numeric && (
            <div className="bg-muted/40 flex flex-col gap-1.5 rounded-xl p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current</span>
                <span className="tabular">{formatQuantity(current, product.unit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span className={`tabular font-medium ${delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : ""}`}>
                  {delta > 0 ? "+" : ""}
                  {formatQuantity(delta)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resulting stock</span>
                <Badge variant={goesNegative ? "destructive" : "secondary"}>
                  {formatQuantity(target, product.unit)}
                </Badge>
              </div>
            </div>
          )}

          {goesNegative && (
            <p className="text-destructive text-xs">Inventory can&apos;t go negative — the server will reject this.</p>
          )}
          {noChange && <p className="text-muted-foreground text-xs">That leaves the quantity unchanged.</p>}

          {delta < 0 && batches.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Deduct from batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional — otherwise largest batches first" />
                </SelectTrigger>
                <SelectContent>
                  {batches
                    .filter((b) => batchAvailable(b) > 0)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.batchNumber} · {formatQuantity(b.remainingQuantity)} left
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-reason">Reason *</Label>
            <Textarea
              id="adjust-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Stock count correction after quarterly audit"
            />
            {reason.trim().length === 0 && (
              <p className="text-muted-foreground text-xs">Required — stored on the movement for accountability.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={adjustStock.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedProduct || !numeric || goesNegative || noChange || !reason.trim() || adjustStock.isPending}
          >
            {adjustStock.isPending ? <Loader2 className="size-4 animate-spin" /> : <SlidersHorizontal className="size-4" />}
            Save adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
