"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/api-client";

/** Download button that owns its own pending state and error toast. */
export function DownloadButton({
  label,
  kind,
  download,
  disabled,
}: {
  label: string;
  kind: "pdf" | "csv";
  download: () => Promise<void>;
  disabled?: boolean;
}) {
  const [pending, setPending] = React.useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      await download();
      toast.success(`${label} downloaded`);
    } catch (error) {
      toast.error(`Couldn't download ${label.toLowerCase()}`, { description: getApiErrorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  const Icon = kind === "pdf" ? FileText : FileSpreadsheet;

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending || disabled}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      {label}
    </Button>
  );
}

export function ReportToolbar({ filters, actions }: { filters: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap items-end gap-3">{filters}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </Card>
  );
}

/** Compact figure tile used across every report summary strip. */
export function SummaryTile({
  label,
  value,
  tone = "default",
  helper,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "destructive" | "primary";
  helper?: string;
}) {
  const toneClass = {
    default: "bg-muted/40",
    primary: "bg-primary-soft/50",
    success: "bg-success-soft/40",
    warning: "bg-warning-soft/40",
    destructive: "bg-destructive-soft/40",
  }[tone];

  const valueClass = {
    default: "",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone];

  return (
    <div className={`flex flex-col gap-1 rounded-xl p-3 ${toneClass}`}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`tabular text-lg font-bold ${valueClass}`}>{value}</span>
      {helper && <span className="text-muted-foreground text-xs">{helper}</span>}
    </div>
  );
}

export { Download };
