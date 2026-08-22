"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeftRight,
  Hammer,
  Layers,
  Loader2,
  PackagePlus,
  Pencil,
  SlidersHorizontal,
  Tags,
  Workflow,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/states";
import { ProductThumb } from "@/components/shared/initials-avatar";
import { ItemTypeBadge, MovementTypeBadge, ProductStockBadge } from "@/components/shared/status-badges";
import { useProduct, useProductBOM, useProductBOMCost } from "@/hooks/queries/use-products";
import { useAssembleProduct, useBatches, useProductMovements } from "@/hooks/queries/use-inventory";
import { getApiErrorMessage } from "@/lib/api-client";
import { batchAvailable, lineValue, movementDirection, num, round, signedMovementQuantity } from "@/lib/calc";
import { cn, formatDate, formatDateTime, formatMoney, formatQuantity } from "@/lib/utils";
import { AddStockDialog, AdjustStockDialog } from "./stock-dialogs";
import { BOMEditorDialog } from "./bom-editor-dialog";
import { BOMTree } from "./bom-tree";
import { CustomFieldsDialog } from "./custom-fields-dialog";
import type { Product } from "@/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
}

/** Builds a composite product straight from its BOM (POST /stock-movements/assemble). */
function AssembleDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [quantity, setQuantity] = React.useState("1");
  const [notes, setNotes] = React.useState("");
  const assemble = useAssembleProduct();

  useResetOnOpen(open, () => {
      setQuantity("1");
      setNotes("");
  });

  const qty = Number(quantity);
  const qtyValid = Number.isInteger(qty) && qty > 0;
  const bom = product.bomSummary ?? [];

  // How many whole units the current component stock supports.
  const maxBuildable = bom.length
    ? Math.min(...bom.map((i) => Math.floor(num(i.currentStock) / (i.quantityRequired || 1))))
    : 0;

  const shortages = bom.filter((i) => i.quantityRequired * qty > num(i.currentStock));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assemble {product.name}</DialogTitle>
          <DialogDescription>Consumes components from stock and adds finished units.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assemble-qty">Quantity to build *</Label>
            <Input
              id="assemble-qty"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Component stock currently supports {maxBuildable} whole {maxBuildable === 1 ? "unit" : "units"}.
            </p>
            {quantity !== "" && !qtyValid && (
              <p className="text-destructive text-xs">Enter a whole number greater than 0.</p>
            )}
          </div>

          {bom.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-medium">Material check</p>
              <div className="flex flex-col gap-1.5">
                {bom.map((item) => {
                  const needed = round(item.quantityRequired * (qtyValid ? qty : 0), 3);
                  const have = num(item.currentStock);
                  const ok = have >= needed;
                  return (
                    <div key={item.childProductId} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground max-w-40 truncate">{item.name}</span>
                      <span className={cn("flex items-center gap-1 font-medium", ok ? "text-success" : "text-destructive")}>
                        {!ok && <AlertTriangle className="size-3" />}
                        Need {formatQuantity(needed)} · have {formatQuantity(have)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assemble-notes">Notes</Label>
            <Input
              id="assemble-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Manual assembly run"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assemble.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              assemble.mutate(
                { productId: product.id, quantity: qty, notes: notes.trim() || undefined },
                {
                  onSuccess: () => {
                    toast.success("Assembly complete", { description: `${qty} × ${product.name} added to stock.` });
                    onOpenChange(false);
                  },
                  onError: (err) => toast.error("Assembly failed", { description: getApiErrorMessage(err) }),
                },
              )
            }
            disabled={!qtyValid || shortages.length > 0 || assemble.isPending}
          >
            {assemble.isPending ? <Loader2 className="size-4 animate-spin" /> : <Hammer className="size-4" />}
            Assemble
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductDetailsDrawer({
  product,
  open,
  onOpenChange,
  onEdit,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (product: Product) => void;
}) {
  const [assembleOpen, setAssembleOpen] = React.useState(false);
  const [bomOpen, setBomOpen] = React.useState(false);
  const [fieldsOpen, setFieldsOpen] = React.useState(false);

  const productId = open && product ? product.id : null;
  const { data: fullProduct } = useProduct(productId);
  const { data: bomCost } = useProductBOMCost(productId, { enabled: !!product?.isComposite });
  const { data: bomTree, isLoading: bomLoading } = useProductBOM(productId);

  // Quantity the BOM tree is planned against.
  const [planQuantity, setPlanQuantity] = React.useState("1");
  const planQty = Number(planQuantity);
  const { data: batches = [] } = useBatches(productId ?? undefined, { enabled: !!productId });
  const { data: movements = [] } = useProductMovements(productId);

  if (!product) return null;

  const item = fullProduct ?? product;
  const stockValue = lineValue(item);
  const materialCost = bomCost?.suggestedCost ?? item.materialCost ?? 0;
  const customFieldCount = Object.keys(item.customFields ?? {}).length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex h-full w-full flex-col overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Item details</SheetTitle>
            <SheetDescription>Stock, composition and full movement history.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 px-6 pb-6">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <ProductThumb name={item.name} imageUrl={item.imageUrl} size="size-16" className="rounded-2xl text-base" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-foreground truncate font-semibold">{item.name}</p>
                <p className="text-muted-foreground text-sm">{item.sku ?? "No SKU"}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ProductStockBadge currentStock={item.currentStock} lowStockThreshold={item.lowStockThreshold} />
                  <ItemTypeBadge itemType={item.itemType} />
                  {item.isComposite && <Badge variant="secondary">Composite</Badge>}
                  {item.isDiscontinued && <Badge variant="muted">Discontinued</Badge>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <AddStockDialog
                productId={item.id}
                trigger={
                  <Button size="sm" variant="outline">
                    <PackagePlus className="size-4" />
                    Add stock
                  </Button>
                }
              />
              <AdjustStockDialog
                productId={item.id}
                trigger={
                  <Button size="sm" variant="outline">
                    <SlidersHorizontal className="size-4" />
                    Adjust
                  </Button>
                }
              />
              <Button size="sm" variant="outline" onClick={() => setBomOpen(true)}>
                <Workflow className="size-4" />
                Edit BOM
              </Button>
              {item.isComposite && (
                <Button size="sm" variant="outline" onClick={() => setAssembleOpen(true)}>
                  <Hammer className="size-4" />
                  Assemble
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setFieldsOpen(true)}>
                <Tags className="size-4" />
                Fields{customFieldCount > 0 ? ` (${customFieldCount})` : ""}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(item);
                }}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            </div>

            <Separator />

            <Tabs defaultValue="overview">
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="flex-1">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="bom" className="flex-1">
                  BOM
                </TabsTrigger>
                <TabsTrigger value="batches" className="flex-1">
                  Batches
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1">
                  History
                </TabsTrigger>
              </TabsList>

              {/* ── Overview ── */}
              <TabsContent value="overview" className="mt-4 flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category" value={item.category?.name ?? "Uncategorised"} />
                  <Field label="Vendor" value={item.vendor?.name ?? "—"} />
                  <Field label="In stock" value={formatQuantity(item.currentStock, item.unit)} />
                  <Field
                    label="Low-stock threshold"
                    value={item.lowStockThreshold !== null ? formatQuantity(item.lowStockThreshold, item.unit) : "Not set"}
                  />
                  <Field label="Unit price" value={formatMoney(item.unitPrice)} />
                  <Field label="Reorder lead time" value={item.reorderTimeDays ? `${item.reorderTimeDays} days` : "—"} />
                  <Field label="Created" value={formatDate(item.createdAt)} />
                  <Field label="Currency" value={item.currency} />
                </div>

                {item.description && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">Description</span>
                    <p className="text-sm">{item.description}</p>
                  </div>
                )}

                <div className="bg-muted/50 flex items-center justify-between rounded-xl p-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Stock value</p>
                    <p className="tabular mt-1 text-xl font-semibold">{formatMoney(stockValue)}</p>
                  </div>
                  {item.isComposite && materialCost > 0 && (
                    <div className="flex flex-col gap-1 text-right">
                      <div>
                        <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                          Material cost / unit
                        </p>
                        <p className="tabular text-muted-foreground mt-0.5 text-xs font-medium">
                          {formatMoney(materialCost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">Margin</p>
                        <p
                          className={cn(
                            "tabular mt-0.5 text-sm font-bold",
                            num(item.unitPrice) > materialCost ? "text-success" : "text-destructive",
                          )}
                        >
                          {formatMoney(round(num(item.unitPrice) - materialCost))}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {bomCost?.priceWarning && (
                  <div className="border-warning/30 bg-warning-soft/40 flex items-start gap-2 rounded-xl border p-3">
                    <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
                    <p className="text-xs">{bomCost.warningMessage}</p>
                  </div>
                )}

                {customFieldCount > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-muted-foreground text-xs">Custom fields</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(item.customFields).map(([k, v]) => (
                        <Badge key={k} variant="outline">
                          {k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ── BOM ── */}
              <TabsContent value="bom" className="mt-4">
                <div className="flex flex-col gap-4">
                  {/* Plan the tree for a chosen batch size, so shortages are
                      answered for the quantity actually being built. */}
                  <div className="bg-muted/40 flex flex-wrap items-center gap-3 rounded-xl p-3">
                    <Label htmlFor="bom-qty" className="text-xs">
                      Plan for
                    </Label>
                    <Input
                      id="bom-qty"
                      type="number"
                      min={1}
                      step="any"
                      value={planQuantity}
                      onChange={(e) => setPlanQuantity(e.target.value)}
                      className="h-8 w-24"
                    />
                    <span className="text-muted-foreground text-xs">{item.unit ?? "units"}</span>
                  </div>

                  <BOMTree
                    bom={bomTree}
                    quantity={planQty > 0 ? planQty : 1}
                    isLoading={bomLoading}
                    onConfigure={() => setBomOpen(true)}
                  />

                  {!!bomCost?.breakdown?.length && (
                    <div className="bg-muted/40 flex items-center justify-between rounded-xl p-3 text-sm">
                      <span className="text-muted-foreground">Suggested material cost per unit</span>
                      <span className="tabular font-semibold">{formatMoney(bomCost.suggestedCost)}</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Batches ── */}
              <TabsContent value="batches" className="mt-4">
                {batches.length === 0 ? (
                  <EmptyState icon={Layers} title="No batches" description="Adding stock creates this item's first batch." />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                          <TableHead className="text-right">Reserved</TableHead>
                          <TableHead className="text-right">Available</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batches.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="font-mono text-xs">{b.batchNumber}</TableCell>
                            <TableCell className="tabular text-right text-sm">
                              {formatQuantity(b.remainingQuantity)}
                            </TableCell>
                            <TableCell className="tabular text-muted-foreground text-right text-sm">
                              {formatQuantity(b.reservedQuantity)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={batchAvailable(b) > 0 ? "success" : "muted"}>
                                {formatQuantity(batchAvailable(b))}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">{formatDate(b.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* ── History ── */}
              <TabsContent value="history" className="mt-4">
                {movements.length === 0 ? (
                  <EmptyState
                    icon={ArrowLeftRight}
                    title="No movements yet"
                    description="Purchases, production and adjustments will appear here."
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {movements.map((m) => {
                      const qty = signedMovementQuantity(m);
                      const dir = movementDirection(m.type);
                      return (
                        <div key={m.id} className="border-border/60 flex items-start gap-3 rounded-xl border px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <MovementTypeBadge type={m.type} />
                              <span
                                className={cn(
                                  "tabular text-sm font-semibold",
                                  dir > 0 ? "text-success" : dir < 0 ? "text-destructive" : "text-muted-foreground",
                                )}
                              >
                                {dir > 0 ? "+" : ""}
                                {formatQuantity(dir === 0 ? Math.abs(qty) : qty)}
                              </span>
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {formatDateTime(m.createdAt)} · {m.performedBy?.name ?? "System"}
                            </p>
                            {(m.reason || m.notes) && (
                              <p className="text-muted-foreground mt-0.5 text-xs">{m.reason ?? m.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <AssembleDialog product={item} open={assembleOpen} onOpenChange={setAssembleOpen} />
      <BOMEditorDialog product={item} open={bomOpen} onOpenChange={setBomOpen} />
      <CustomFieldsDialog product={item} open={fieldsOpen} onOpenChange={setFieldsOpen} />
    </>
  );
}
