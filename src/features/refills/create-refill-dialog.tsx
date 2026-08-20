"use client";

import * as React from "react";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProductRequest, useBOMPreview } from "@/hooks/queries/use-product-requests";
import { useProducts } from "@/hooks/queries/use-products";
import { useTasks } from "@/hooks/queries/use-tasks";
import { getApiErrorMessage } from "@/lib/api-client";
import { num } from "@/lib/calc";
import { formatQuantity } from "@/lib/utils";
import type { ProductRequestType } from "@/types";

export function CreateRefillDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<ProductRequestType>("GENERAL");
  const [productId, setProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [taskId, setTaskId] = React.useState("");
  const [reason, setReason] = React.useState("");

  const createRequest = useCreateProductRequest();
  const { data: productsData } = useProducts({ isDiscontinued: false, showPerPage: 200 }, { enabled: open });
  const { data: tasksData } = useTasks({ showPerPage: 100 });

  const products = productsData?.products ?? [];
  const product = products.find((p) => p.id === productId);

  const qty = Number(quantity);
  const qtyValid = Number.isFinite(qty) && qty > 0;

  // Composite items expand into their components — preview what will be drawn down.
  const { data: bomPreview, isLoading: bomLoading } = useBOMPreview(
    product?.isComposite ? productId : null,
    qtyValid ? qty : 1,
    { enabled: open && !!product?.isComposite },
  );

  // Only tasks the requester can still act on are valid targets.
  const activeTasks = (tasksData?.tasks ?? []).filter(
    (t) => !["COMPLETED", "CANCELLED"].includes(t.status),
  );

  useResetOnOpen(open, () => {
      setType("GENERAL");
      setProductId("");
      setQuantity("1");
      setTaskId("");
      setReason("");
  });

  const needsTask = type === "TASK_RELATED";
  const canSubmit = !!productId && qtyValid && (!needsTask || !!taskId);

  const insufficientStock = product && qtyValid && num(product.currentStock) < qty;

  const handleSubmit = () =>
    createRequest.mutate(
      {
        productId,
        quantity: qty,
        type,
        taskId: needsTask ? taskId : undefined,
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Request submitted", { description: "An admin will review it shortly." });
          setOpen(false);
        },
        onError: (error) => toast.error("Couldn't submit request", { description: getApiErrorMessage(error) }),
      },
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            New request
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request materials</DialogTitle>
          <DialogDescription>Ask an admin to release stock to you, for a task or in general.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Request type *</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as ProductRequestType);
                setTaskId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERAL">General — not tied to a task</SelectItem>
                <SelectItem value="TASK_RELATED">For a production task</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsTask && (
            <div className="flex flex-col gap-1.5">
              <Label>Task *</Label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Which task is this for?" />
                </SelectTrigger>
                <SelectContent>
                  {activeTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeTasks.length === 0 && (
                <p className="text-muted-foreground text-xs">You have no active tasks to attach this to.</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Item *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="What do you need?" />
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="request-qty">Quantity *</Label>
            <Input
              id="request-qty"
              type="number"
              min={0.001}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {quantity !== "" && !qtyValid && <p className="text-destructive text-xs">Quantity must be greater than 0.</p>}
          </div>

          {product && (
            <div className="bg-muted/40 flex items-center justify-between rounded-xl p-3 text-xs">
              <span className="text-muted-foreground">Currently in stock</span>
              <Badge variant={insufficientStock ? "warning" : "success"}>
                {formatQuantity(product.currentStock, product.unit)}
              </Badge>
            </div>
          )}

          {insufficientStock && (
            <div className="border-warning/30 bg-warning-soft/40 flex items-start gap-2 rounded-xl border p-3">
              <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
              <p className="text-xs">
                Stock on hand is below what you&apos;re asking for. You can still submit — the admin decides whether to
                approve or restock first.
              </p>
            </div>
          )}

          {product?.isComposite && (
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-medium">Components this will consume</p>
              {bomLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Loader2 className="size-3.5 animate-spin" /> Expanding bill of materials…
                </div>
              ) : !bomPreview?.components.length ? (
                <p className="text-muted-foreground text-xs">No components configured for this item.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead className="text-right">Per unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomPreview.components.map((c) => (
                      <TableRow key={c.productId}>
                        <TableCell className="text-sm">{c.name}</TableCell>
                        <TableCell className="tabular text-right text-sm">
                          {formatQuantity(c.quantityRequiredPerUnit)}
                        </TableCell>
                        <TableCell className="tabular text-right text-sm font-medium">
                          {formatQuantity(c.totalQuantityRequired)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="request-reason">Reason</Label>
            <Textarea
              id="request-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need this?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={createRequest.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createRequest.isPending}>
            {createRequest.isPending && <Loader2 className="size-4 animate-spin" />}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
