"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Plus, Trash2, Workflow } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/states";
import { useProductBOM, useProducts, useReplaceBOM } from "@/hooks/queries/use-products";
import { getApiErrorMessage } from "@/lib/api-client";
import { num, round } from "@/lib/calc";
import { formatMoney } from "@/lib/utils";
import type { Product } from "@/types";

interface BOMLine {
  childProductId: string;
  quantityRequired: string;
}

/**
 * Replaces a product's whole component list — the backend's PUT /products/:id/bom
 * is a full replacement, so the dialog edits the complete list at once.
 */
export function BOMEditorDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draftLines, setDraftLines] = React.useState<BOMLine[] | null>(null);
  const { data: bom, isLoading: bomLoading } = useProductBOM(open ? product.id : null);
  const { data: productsData } = useProducts({ isDiscontinued: false, showPerPage: 300 }, { enabled: open });
  const replaceBOM = useReplaceBOM();

  const catalogue = React.useMemo(
    () => (productsData?.products ?? []).filter((p) => p.id !== product.id),
    [productsData, product.id],
  );

  // Discard local edits whenever the dialog reopens, so it always starts from
  // the saved BOM rather than a stale draft.
  useResetOnOpen(open, () => setDraftLines(null));

  // `null` means "untouched" — fall back to the server's BOM until the user edits.
  const savedLines = React.useMemo<BOMLine[]>(
    () =>
      (bom?.children ?? []).map((c) => ({
        childProductId: c.productId,
        quantityRequired: String(c.quantityRequired),
      })),
    [bom],
  );
  const lines = draftLines ?? savedLines;

  const addLine = () => setDraftLines([...lines, { childProductId: "", quantityRequired: "1" }]);
  const removeLine = (index: number) => setDraftLines(lines.filter((_, i) => i !== index));
  const updateLine = (index: number, patch: Partial<BOMLine>) =>
    setDraftLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const usedIds = new Set(lines.map((l) => l.childProductId).filter(Boolean));
  const duplicates = lines.filter((l, i) => l.childProductId && lines.findIndex((o) => o.childProductId === l.childProductId) !== i);

  const resolved = lines.map((l) => {
    const child = catalogue.find((p) => p.id === l.childProductId);
    const qty = Number(l.quantityRequired);
    const qtyValid = Number.isFinite(qty) && qty > 0;
    return { ...l, child, qty, qtyValid, lineCost: child && qtyValid ? round(qty * num(child.unitPrice)) : 0 };
  });

  const suggestedCost = round(resolved.reduce((sum, r) => sum + r.lineCost, 0));
  const sellingPrice = num(product.unitPrice);
  const priceWarning = suggestedCost > 0 && suggestedCost >= sellingPrice;

  const valid =
    lines.length > 0 && resolved.every((r) => r.child && r.qtyValid) && duplicates.length === 0;

  const handleSubmit = () =>
    replaceBOM.mutate(
      {
        id: product.id,
        items: resolved.map((r) => ({ childProductId: r.childProductId, quantityRequired: r.qty })),
      },
      {
        onSuccess: () => {
          toast.success("Bill of materials saved", { description: `${lines.length} components recorded.` });
          onOpenChange(false);
        },
        onError: (error) => toast.error("Couldn't save BOM", { description: getApiErrorMessage(error) }),
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bill of materials</DialogTitle>
          <DialogDescription>
            Components consumed to build one unit of <span className="text-foreground font-medium">{product.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {bomLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading current BOM…
            </div>
          ) : lines.length === 0 ? (
            <EmptyState
              icon={Workflow}
              title="No components yet"
              description="Add the parts this product is built from."
              action={
                <Button size="sm" onClick={addLine}>
                  <Plus className="size-4" />
                  Add component
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-52">Component</TableHead>
                    <TableHead className="w-32 text-right">Qty per unit</TableHead>
                    <TableHead className="w-28 text-right">Unit price</TableHead>
                    <TableHead className="w-28 text-right">Line cost</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolved.map((line, i) => {
                    const isDuplicate = duplicates.some((d) => d === lines[i]);
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <Select
                            value={line.childProductId}
                            onValueChange={(v) => updateLine(i, { childProductId: v })}
                          >
                            <SelectTrigger className={isDuplicate ? "border-destructive" : undefined}>
                              <SelectValue placeholder="Select a component" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogue.map((p) => (
                                <SelectItem
                                  key={p.id}
                                  value={p.id}
                                  disabled={usedIds.has(p.id) && p.id !== line.childProductId}
                                >
                                  {p.name}
                                  {p.sku ? ` · ${p.sku}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isDuplicate && <p className="text-destructive mt-1 text-xs">Already listed above.</p>}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0.0001}
                            step="any"
                            value={line.quantityRequired}
                            onChange={(e) => updateLine(i, { quantityRequired: e.target.value })}
                            className={!line.qtyValid ? "border-destructive" : undefined}
                          />
                        </TableCell>
                        <TableCell className="tabular text-muted-foreground text-right text-sm">
                          {line.child ? formatMoney(line.child.unitPrice) : "—"}
                        </TableCell>
                        <TableCell className="tabular text-right text-sm font-medium">
                          {line.child && line.qtyValid ? formatMoney(line.lineCost) : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removeLine(i)}
                            aria-label="Remove component"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {lines.length > 0 && (
            <Button variant="outline" size="sm" onClick={addLine} className="self-start">
              <Plus className="size-4" />
              Add component
            </Button>
          )}

          {/* Live cost preview — the authoritative figure comes from GET /products/:id/bom/cost. */}
          {lines.length > 0 && (
            <div className="bg-muted/40 flex flex-col gap-2 rounded-xl p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Suggested material cost per unit</span>
                <span className="tabular font-semibold">{formatMoney(suggestedCost)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current selling price</span>
                <span className="tabular font-semibold">{formatMoney(sellingPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Margin</span>
                <Badge variant={priceWarning ? "destructive" : "success"}>
                  {formatMoney(round(sellingPrice - suggestedCost))}
                </Badge>
              </div>
            </div>
          )}

          {priceWarning && (
            <div className="border-warning/30 bg-warning-soft/40 flex items-start gap-2 rounded-xl border p-3">
              <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
              <p className="text-xs">
                The selling price is at or below the material cost. Review the price before producing this item.
              </p>
            </div>
          )}

          <p className="text-muted-foreground text-xs">
            Saving replaces the entire component list. Existing production tasks keep the snapshot they were created with.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={replaceBOM.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || replaceBOM.isPending}>
            {replaceBOM.isPending && <Loader2 className="size-4 animate-spin" />}
            Save bill of materials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
