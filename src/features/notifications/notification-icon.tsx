import {
  AlertTriangle,
  Ban,
  Bell,
  CheckCircle2,
  ClipboardList,
  Factory,
  PackageCheck,
  Play,
  Truck,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Notifications are stored as free text, so the icon is derived from the
 * title the backend writes (see `notificationServices.create` call sites).
 */
const RULES: { match: RegExp; icon: LucideIcon; tone: string }[] = [
  { match: /salary|payment/i, icon: Wallet, tone: "text-success bg-success-soft" },
  { match: /overtime/i, icon: Bell, tone: "text-warning bg-warning-soft" },
  { match: /refill.*approved/i, icon: CheckCircle2, tone: "text-success bg-success-soft" },
  { match: /refill.*rejected/i, icon: XCircle, tone: "text-destructive bg-destructive-soft" },
  { match: /refill/i, icon: Truck, tone: "text-accent bg-accent-soft" },
  { match: /cancelled/i, icon: Ban, tone: "text-destructive bg-destructive-soft" },
  { match: /completed/i, icon: PackageCheck, tone: "text-success bg-success-soft" },
  { match: /partial/i, icon: Factory, tone: "text-accent bg-accent-soft" },
  { match: /started/i, icon: Play, tone: "text-primary bg-primary-soft" },
  { match: /accepted/i, icon: CheckCircle2, tone: "text-secondary bg-secondary-soft" },
  { match: /assigned|task/i, icon: ClipboardList, tone: "text-primary bg-primary-soft" },
  { match: /stock|low/i, icon: AlertTriangle, tone: "text-warning bg-warning-soft" },
];

export function notificationIcon(title: string): { icon: LucideIcon; tone: string } {
  for (const rule of RULES) {
    if (rule.match.test(title)) return { icon: rule.icon, tone: rule.tone };
  }
  return { icon: Bell, tone: "text-muted-foreground bg-muted" };
}
