import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Hammer,
  Lock,
  MinusCircle,
  PackageCheck,
  PackageX,
  PauseCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { num, stockLevel } from "@/lib/calc";
import type {
  Decimalish,
  OvertimeStatus,
  PaymentStatus,
  ProductRequestStatus,
  StockMovementType,
  TaskStatus,
} from "@/types";

type Variant = "default" | "secondary" | "accent" | "success" | "warning" | "destructive" | "outline" | "muted";

// ── Production tasks ───────────────────────────────────────────────────────
const TASK_STATUS: Record<TaskStatus, { label: string; variant: Variant; icon: typeof Clock }> = {
  PENDING: { label: "Pending", variant: "warning", icon: Clock },
  ACCEPTED: { label: "Accepted", variant: "secondary", icon: CheckCircle2 },
  IN_PROGRESS: { label: "In progress", variant: "default", icon: Play },
  PARTIALLY_COMPLETED: { label: "Partial", variant: "accent", icon: PauseCircle },
  COMPLETED: { label: "Completed", variant: "success", icon: PackageCheck },
  CANCELLED: { label: "Cancelled", variant: "destructive", icon: Ban },
};

export function TaskStatusBadge({ status, showIcon = true }: { status: TaskStatus; showIcon?: boolean }) {
  const s = TASK_STATUS[status] ?? { label: status, variant: "muted" as Variant, icon: CircleDashed };
  const Icon = s.icon;
  return (
    <Badge variant={s.variant}>
      {showIcon && <Icon />}
      {s.label}
    </Badge>
  );
}

export const TASK_STATUS_META = TASK_STATUS;

// ── Product / refill requests ──────────────────────────────────────────────
const REQUEST_STATUS: Record<ProductRequestStatus | "FULFILLED", { label: string; variant: Variant; icon: typeof Clock }> = {
  PENDING: { label: "Pending", variant: "warning", icon: Clock },
  APPROVED: { label: "Approved", variant: "secondary", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
  FULFILLED: { label: "Issued", variant: "success", icon: PackageCheck },
};

export function RequestStatusBadge({ status, isFulfilled }: { status: ProductRequestStatus; isFulfilled?: boolean }) {
  const key = isFulfilled && status === "APPROVED" ? "FULFILLED" : status;
  const s = REQUEST_STATUS[key];
  const Icon = s.icon;
  return (
    <Badge variant={s.variant}>
      <Icon />
      {s.label}
    </Badge>
  );
}

// ── Overtime ───────────────────────────────────────────────────────────────
const OVERTIME_STATUS: Record<OvertimeStatus, { label: string; variant: Variant; icon: typeof Clock }> = {
  PENDING: { label: "Awaiting review", variant: "warning", icon: Clock },
  APPROVED: { label: "Approved", variant: "success", icon: ShieldCheck },
  REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export function OvertimeStatusBadge({ status }: { status: OvertimeStatus }) {
  const s = OVERTIME_STATUS[status];
  const Icon = s.icon;
  return (
    <Badge variant={s.variant}>
      <Icon />
      {s.label}
    </Badge>
  );
}

// ── Payroll ────────────────────────────────────────────────────────────────
const PAYMENT_STATUS: Record<PaymentStatus, { label: string; variant: Variant; icon: typeof Wallet }> = {
  UNPAID: { label: "Unpaid", variant: "destructive", icon: MinusCircle },
  PARTIALLY_PAID: { label: "Partially paid", variant: "warning", icon: Wallet },
  PAID: { label: "Paid", variant: "success", icon: CheckCircle2 },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_STATUS[status];
  const Icon = s.icon;
  return (
    <Badge variant={s.variant}>
      <Icon />
      {s.label}
    </Badge>
  );
}

// ── Stock movements ────────────────────────────────────────────────────────
const MOVEMENT_TYPE: Record<StockMovementType, { label: string; variant: Variant; icon: typeof ArrowUpRight }> = {
  PURCHASE: { label: "Purchase", variant: "success", icon: ArrowUpRight },
  CONSUMPTION: { label: "Consumption", variant: "warning", icon: ArrowDownLeft },
  ADJUSTMENT: { label: "Adjustment", variant: "secondary", icon: RotateCcw },
  WRITE_OFF: { label: "Write-off", variant: "destructive", icon: PackageX },
  RETURN: { label: "Return", variant: "accent", icon: RotateCcw },
  ASSEMBLY: { label: "Assembly", variant: "default", icon: Hammer },
  TASK_RESERVATION: { label: "Reserved", variant: "secondary", icon: Lock },
  TASK_RELEASE: { label: "Released", variant: "muted", icon: Sparkles },
  DAMAGE: { label: "Damage", variant: "destructive", icon: AlertTriangle },
  REFILL: { label: "Refill", variant: "accent", icon: Truck },
};

export function MovementTypeBadge({ type }: { type: StockMovementType }) {
  const s = MOVEMENT_TYPE[type] ?? { label: type, variant: "muted" as Variant, icon: CircleDashed };
  const Icon = s.icon;
  return (
    <Badge variant={s.variant}>
      <Icon />
      {s.label}
    </Badge>
  );
}

export const MOVEMENT_TYPE_META = MOVEMENT_TYPE;

// ── Inventory ──────────────────────────────────────────────────────────────
/** Stock state is derived on the client — the backend stores no status column. */
export function ProductStockBadge({
  currentStock,
  lowStockThreshold,
}: {
  currentStock: Decimalish;
  lowStockThreshold: Decimalish | null;
}) {
  const level = stockLevel({ currentStock, lowStockThreshold });
  if (level === "negative") return <Badge variant="destructive"><AlertTriangle />Negative ({num(currentStock)})</Badge>;
  if (level === "out") return <Badge variant="destructive"><PackageX />Out of stock</Badge>;
  if (level === "low") return <Badge variant="warning"><AlertTriangle />Low stock</Badge>;
  return <Badge variant="success"><PackageCheck />In stock</Badge>;
}

export function ItemTypeBadge({ itemType }: { itemType: "COMPONENT" | "PRODUCT" }) {
  return itemType === "COMPONENT" ? (
    <Badge variant="secondary">Component</Badge>
  ) : (
    <Badge variant="default">Product</Badge>
  );
}

export function EmployeeActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "success" : "muted"}>
      {isActive ? <CheckCircle2 /> : <Ban />}
      {isActive ? "Active" : "Deactivated"}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: "ADMIN" | "EMPLOYEE" }) {
  return <Badge variant={role === "ADMIN" ? "default" : "muted"}>{role === "ADMIN" ? "Admin" : "Employee"}</Badge>;
}
