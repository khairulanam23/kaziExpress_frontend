"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Factory,
  Layers,
  Loader2,
  Package,
  Plus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { useCreateTask } from "@/hooks/queries/use-tasks";
import { useProductBOM, useProducts } from "@/hooks/queries/use-products";
import { useBatches } from "@/hooks/queries/use-inventory";
import { useEmployeeOptions } from "@/hooks/queries/use-users";
import { getApiErrorMessage } from "@/lib/api-client";
import { batchAvailable, bomRequirements, round } from "@/lib/calc";
import { cn, formatQuantity, toDateInput } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3;

const STEPS = [
  { title: "Product & quantity", icon: Package },
  { title: "Material requirements", icon: Factory },
  { title: "Batch allocation", icon: Layers },
  { title: "Assign & schedule", icon: Users },
] as const;

interface AllocationDraft {
  /** batchId → quantity to allocate */
  [batchId: string]: number;
}

export function CreateTaskDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>(0);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [productId, setProductId] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<string>("1");
  const [deadline, setDeadline] = React.useState("");
  const [assignedEmployeeIds, setAssignedEmployeeIds] = React.useState<string[]>([]);
  const [allocations, setAllocations] = React.useState<AllocationDraft>({});

  const createTask = useCreateTask();

  // Only finished products can be produced by a task.
  const { data: productsData, isLoading: productsLoading } = useProducts(
    { itemType: "PRODUCT", isDiscontinued: false, showPerPage: 200 },
    { enabled: open },
  );
  const products = productsData?.products ?? [];
  const selectedProduct = products.find((p) => p.id === productId);

  const { data: bom, isLoading: bomLoading } = useProductBOM(productId || null, { enabled: open && !!productId });
  const { data: batches = [], isLoading: batchesLoading } = useBatches(undefined, { enabled: open && step >= 2 });
  const { employees, isLoading: employeesLoading } = useEmployeeOptions({ enabled: open });

  const qty = Number(quantity);
  const qtyValid = Number.isFinite(qty) && qty > 0;

  /** Per-component requirements for the requested production quantity. */
  const requirements = React.useMemo(() => bomRequirements(bom, qtyValid ? qty : 0), [bom, qty, qtyValid]);

  /** Batches grouped by the component they hold, with live availability. */
  const batchesByProduct = React.useMemo(() => {
    const map = new Map<string, typeof batches>();
    for (const batch of batches) {
      if (batchAvailable(batch) <= 0) continue;
      const list = map.get(batch.productId) ?? [];
      list.push(batch);
      map.set(batch.productId, list);
    }
    return map;
  }, [batches]);

  /** How much of each component the draft allocation currently covers. */
  const allocatedByProduct = React.useMemo(() => {
    const totals: Record<string, number> = {};
    for (const [batchId, amount] of Object.entries(allocations)) {
      const batch = batches.find((b) => b.id === batchId);
      if (!batch || !amount) continue;
      totals[batch.productId] = round((totals[batch.productId] ?? 0) + amount, 3);
    }
    return totals;
  }, [allocations, batches]);

  const overAllocated = React.useMemo(
    () =>
      Object.entries(allocations).filter(([batchId, amount]) => {
        const batch = batches.find((b) => b.id === batchId);
        return !!batch && amount > batchAvailable(batch);
      }),
    [allocations, batches],
  );

  const reset = () => {
    setStep(0);
    setTitle("");
    setDescription("");
    setProductId("");
    setQuantity("1");
    setDeadline("");
    setAssignedEmployeeIds([]);
    setAllocations({});
  };

  /** Fills each component's allocation from the batches with the most stock first. */
  const autoAllocate = () => {
    const draft: AllocationDraft = {};
    for (const req of requirements) {
      let outstanding = req.required;
      const candidates = [...(batchesByProduct.get(req.productId) ?? [])].sort(
        (a, b) => batchAvailable(b) - batchAvailable(a),
      );
      for (const batch of candidates) {
        if (outstanding <= 0) break;
        const take = Math.min(batchAvailable(batch), outstanding);
        if (take > 0) {
          draft[batch.id] = round(take, 3);
          outstanding = round(outstanding - take, 3);
        }
      }
    }
    setAllocations(draft);
    toast.success("Batches allocated", { description: "Adjust any line before continuing." });
  };

  const canContinue = (): boolean => {
    if (step === 0) return title.trim().length > 0 && !!productId && qtyValid;
    if (step === 1) return true;
    if (step === 2) return overAllocated.length === 0;
    return true;
  };

  const handleSubmit = () => {
    const batchAllocations = Object.entries(allocations)
      .filter(([, amount]) => amount > 0)
      .map(([batchId, quantity]) => ({ batchId, quantity }));

    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        productId,
        productionQuantity: qty,
        assignedEmployeeIds: assignedEmployeeIds.length ? assignedEmployeeIds : undefined,
        deadline: deadline || undefined,
        batchAllocations: batchAllocations.length ? batchAllocations : undefined,
      },
      {
        onSuccess: (task) => {
          toast.success("Production task created", { description: `"${task.title}" is ready to be accepted.` });
          setOpen(false);
          reset();
        },
        onError: (error) => toast.error("Couldn't create task", { description: getApiErrorMessage(error) }),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            New task
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create production task</DialogTitle>
          <DialogDescription>
            Pick what to build, reserve the materials it needs, then hand it to your team.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const state = i === step ? "current" : i < step ? "done" : "upcoming";
            return (
              <React.Fragment key={s.title}>
                <button
                  type="button"
                  onClick={() => i < step && setStep(i as Step)}
                  disabled={i > step}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                    state === "current" && "bg-primary text-primary-foreground",
                    state === "done" && "text-success hover:bg-muted cursor-pointer",
                    state === "upcoming" && "text-muted-foreground",
                  )}
                >
                  {state === "done" ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex min-h-70 flex-col gap-4">
          {/* ── Step 0: product & quantity ── */}
          {step === 0 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-title">Task title *</Label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Build 50 × 20W chargers"
                />
                {!title.trim() && <p className="text-muted-foreground text-xs">Give the task a name your team will recognise.</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Product to produce *</Label>
                  <Select value={productId} onValueChange={setProductId} disabled={productsLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={productsLoading ? "Loading products…" : "Select a product"} />
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
                  <Label htmlFor="task-qty">Production quantity *</Label>
                  <Input
                    id="task-qty"
                    type="number"
                    min={0.001}
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  {!qtyValid && <p className="text-destructive text-xs">Quantity must be greater than 0.</p>}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-desc">Description</Label>
                <Textarea
                  id="task-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any instructions for the team…"
                  rows={3}
                />
              </div>

              {selectedProduct && (
                <div className="bg-muted/40 flex items-center gap-3 rounded-xl p-3">
                  <span className="bg-primary-soft text-primary flex size-9 items-center justify-center rounded-lg">
                    <Package className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{selectedProduct.name}</p>
                    <p className="text-muted-foreground text-xs">
                      Current stock {formatQuantity(selectedProduct.currentStock, selectedProduct.unit)}
                    </p>
                  </div>
                  {selectedProduct.isComposite && <Badge variant="secondary">Has BOM</Badge>}
                </div>
              )}
            </>
          )}

          {/* ── Step 1: requirements ── */}
          {step === 1 && (
            <>
              <p className="text-muted-foreground text-sm">
                Materials needed for {formatQuantity(qty, selectedProduct?.unit)} of{" "}
                <span className="text-foreground font-medium">{selectedProduct?.name}</span>, taken from its bill of materials.
              </p>

              {bomLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                  <Loader2 className="size-4 animate-spin" /> Loading bill of materials…
                </div>
              ) : requirements.length === 0 ? (
                <EmptyState
                  icon={Factory}
                  title="No bill of materials"
                  description="This product has no components configured, so the task won't reserve any materials. You can still create it."
                />
              ) : (
                <div className="rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead className="text-right">Per unit</TableHead>
                        <TableHead className="text-right">Required</TableHead>
                        <TableHead className="text-right">In stock</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requirements.map((r) => (
                        <TableRow key={r.productId}>
                          <TableCell>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-muted-foreground text-xs">{r.sku ?? "No SKU"}</p>
                          </TableCell>
                          <TableCell className="tabular text-right">{formatQuantity(r.perUnit)}</TableCell>
                          <TableCell className="tabular text-right font-semibold">{formatQuantity(r.required)}</TableCell>
                          <TableCell className="tabular text-right">{formatQuantity(r.available)}</TableCell>
                          <TableCell className="text-right">
                            {r.sufficient ? (
                              <Badge variant="success">Sufficient</Badge>
                            ) : (
                              <Badge variant="destructive">Short {formatQuantity(r.shortage)}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {requirements.some((r) => !r.sufficient) && (
                <div className="border-warning/30 bg-warning-soft/40 flex items-start gap-2 rounded-xl border p-3">
                  <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
                  <p className="text-xs">
                    Some components are short. You can still create the task, but employees won&apos;t be able to accept it
                    until enough stock is available — the server re-checks availability at acceptance time.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Step 2: batch allocation ── */}
          {step === 2 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">
                  Choose which batches supply each component. Allocation is optional but recommended.
                </p>
                <Button variant="outline" size="sm" onClick={autoAllocate} disabled={!requirements.length || batchesLoading}>
                  <Layers className="size-3.5" />
                  Auto-allocate
                </Button>
              </div>

              {batchesLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                  <Loader2 className="size-4 animate-spin" /> Loading batches…
                </div>
              ) : requirements.length === 0 ? (
                <EmptyState icon={Layers} title="Nothing to allocate" description="This product has no components." />
              ) : (
                <div className="flex flex-col gap-4">
                  {requirements.map((req) => {
                    const available = batchesByProduct.get(req.productId) ?? [];
                    const allocated = allocatedByProduct[req.productId] ?? 0;
                    const covered = allocated >= req.required;

                    return (
                      <div key={req.productId} className="rounded-xl border border-border p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{req.name}</p>
                            <p className="text-muted-foreground text-xs">
                              Needs {formatQuantity(req.required)} · allocated {formatQuantity(allocated)}
                            </p>
                          </div>
                          <Badge variant={covered ? "success" : allocated > 0 ? "warning" : "muted"}>
                            {covered ? "Fully covered" : allocated > 0 ? `Short ${formatQuantity(req.required - allocated)}` : "Not allocated"}
                          </Badge>
                        </div>

                        {available.length === 0 ? (
                          <p className="text-muted-foreground text-xs">No batches with available stock for this component.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {available.map((batch) => {
                              const max = batchAvailable(batch);
                              const value = allocations[batch.id] ?? 0;
                              const invalid = value > max;
                              return (
                                <div key={batch.id} className="flex flex-wrap items-center gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-mono text-xs">{batch.batchNumber}</p>
                                    <p className="text-muted-foreground text-xs">
                                      {formatQuantity(max)} available of {formatQuantity(batch.remainingQuantity)}
                                    </p>
                                  </div>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={max}
                                    step="any"
                                    value={value || ""}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const next = e.target.value === "" ? 0 : Number(e.target.value);
                                      setAllocations((prev) => ({ ...prev, [batch.id]: Number.isFinite(next) ? next : 0 }));
                                    }}
                                    className={cn("h-8 w-28", invalid && "border-destructive")}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {overAllocated.length > 0 && (
                <p className="text-destructive text-xs">
                  One or more lines exceed the available quantity in that batch. Reduce them before continuing.
                </p>
              )}
            </>
          )}

          {/* ── Step 3: assign & schedule ── */}
          {step === 3 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-deadline" className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" /> Deadline
                </Label>
                <Input
                  id="task-deadline"
                  type="date"
                  min={toDateInput(new Date())}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-52"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Assign employees</Label>
                {employeesLoading ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin" /> Loading employees…
                  </div>
                ) : employees.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No active employees to assign.</p>
                ) : (
                  <div className="thin-scrollbar flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl border border-border p-2">
                    {employees.map((emp) => {
                      const checked = assignedEmployeeIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              setAssignedEmployeeIds((prev) =>
                                next ? [...prev, emp.id] : prev.filter((id) => id !== emp.id),
                              )
                            }
                          />
                          <UserAvatar name={emp.name ?? emp.email} imageUrl={emp.avatarUrl} size="size-7" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{emp.name ?? "Unnamed"}</p>
                            <p className="text-muted-foreground truncate text-xs">{emp.email}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-muted-foreground text-xs">
                  Assigned employees are notified immediately and can accept the task from their dashboard.
                </p>
              </div>

              {/* Summary */}
              <div className="bg-muted/40 flex flex-col gap-1.5 rounded-xl p-3 text-sm">
                <p className="font-medium">Summary</p>
                <div className="text-muted-foreground flex justify-between">
                  <span>Product</span>
                  <span className="text-foreground">{selectedProduct?.name ?? "—"}</span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Quantity</span>
                  <span className="text-foreground tabular">{formatQuantity(qty, selectedProduct?.unit)}</span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Components</span>
                  <span className="text-foreground tabular">{requirements.length}</span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Batches allocated</span>
                  <span className="text-foreground tabular">
                    {Object.values(allocations).filter((v) => v > 0).length}
                  </span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Assignees</span>
                  <span className="text-foreground tabular">{assignedEmployeeIds.length}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
            disabled={step === 0 || createTask.isPending}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>

          {step < 3 ? (
            <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canContinue()}>
              Continue
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createTask.isPending || !canContinue()}>
              {createTask.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Create task
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
