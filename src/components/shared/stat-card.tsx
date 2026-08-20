"use client";

import { motion } from "framer-motion";
import { type LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: number; direction: "up" | "down" };
  helper?: string;
  accent?: "primary" | "secondary" | "accent" | "success" | "warning" | "destructive";
  sparkline?: number[];
}

const accentMap = {
  primary: "text-primary bg-primary-soft",
  secondary: "text-secondary bg-secondary-soft",
  accent: "text-accent bg-accent-soft",
  success: "text-success bg-success-soft",
  warning: "text-warning bg-warning-soft",
  destructive: "text-destructive bg-destructive-soft",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  helper,
  accent = "primary",
  sparkline,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="card-glow rounded-2xl h-full"
    >
      <Card className="h-full flex flex-col gap-4 py-5 hover:shadow-[0_12px_32px_-12px_rgba(61,90,254,0.25)]">
        <div className="flex items-center justify-between px-6">
          <span className={cn("flex size-10 items-center justify-center rounded-xl", accentMap[accent])}>
            <Icon className="size-5" />
          </span>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular",
                trend.direction === "up" ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive",
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {trend.value}%
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 px-6 flex-1">
          <span className="text-2xl font-semibold tabular leading-none">{value}</span>
          <span className="text-muted-foreground text-sm">{label}</span>
        </div>
        {sparkline && sparkline.length > 1 && (
          <div className="px-6">
            <Sparkline data={sparkline} accent={accent} />
          </div>
        )}
        {helper && <div className="text-muted-foreground px-6 text-xs mt-auto">{helper}</div>}
      </Card>
    </motion.div>
  );
}

function Sparkline({ data, accent }: { data: number[]; accent: StatCardProps["accent"] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 24 - ((d - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(" ");

  const colorVar =
    accent === "primary"
      ? "var(--primary)"
      : accent === "secondary"
        ? "var(--secondary)"
        : accent === "accent"
          ? "var(--accent)"
          : accent === "success"
            ? "var(--success)"
            : accent === "warning"
              ? "var(--warning)"
              : "var(--destructive)";

  return (
    <svg viewBox="0 0 100 24" className="h-6 w-full overflow-visible" preserveAspectRatio="none">
      <polyline fill="none" stroke={colorVar} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}
