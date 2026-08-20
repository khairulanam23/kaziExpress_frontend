"use client";

import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export function LowStockBanner({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-warning/30 bg-warning-soft flex items-center gap-3 rounded-2xl border px-4 py-3"
    >
      <span className="bg-warning/15 text-warning flex size-9 shrink-0 items-center justify-center rounded-xl">
        <AlertTriangle className="size-4.5" />
      </span>
      <div>
        <p className="text-sm font-medium">
          {count} {count === 1 ? "product is" : "products are"} running low on stock
        </p>
        <p className="text-muted-foreground text-xs">Restock soon to avoid stockouts — filter by &quot;Low stock&quot; below.</p>
      </div>
    </motion.div>
  );
}
