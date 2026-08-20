"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/shared/states";
import { useSystemConfig, useUpdateSystemConfig } from "@/hooks/queries/use-config";
import { CONFIG_KEYS } from "@/services/config.service";
import { getApiErrorMessage } from "@/lib/api-client";

type FieldDef =
  | { key: string; label: string; help: string; type: "number"; min?: number; step?: string }
  | { key: string; label: string; help: string; type: "boolean" }
  | { key: string; label: string; help: string; type: "select"; options: { value: string; label: string }[] };

const FIELDS: FieldDef[] = [
  {
    key: CONFIG_KEYS.requiredWorkingHours,
    label: "Required working hours",
    help: "Daily hours before overtime starts accruing on new attendance records.",
    type: "number",
    min: 0.5,
    step: "0.5",
  },
  {
    key: CONFIG_KEYS.overtimeMultiplier,
    label: "Overtime multiplier",
    help: "Overtime is paid at the hourly rate times this factor.",
    type: "number",
    min: 1,
    step: "0.1",
  },
  {
    key: CONFIG_KEYS.defaultLateGraceMinutes,
    label: "Late grace period (minutes)",
    help: "Default grace window applied to new employee profiles.",
    type: "number",
    min: 0,
    step: "1",
  },
  {
    key: CONFIG_KEYS.negativeStockMaxDays,
    label: "Negative stock tolerance (days)",
    help: "How long an item may sit below zero before it's flagged.",
    type: "number",
    min: 0,
    step: "1",
  },
  {
    key: CONFIG_KEYS.defaultPayCalculationMode,
    label: "Default pay mode",
    help: "Applied to newly created employee profiles.",
    type: "select",
    options: [
      { value: "HOURLY", label: "Hourly" },
      { value: "DAILY_PLUS_OVERTIME", label: "Daily + overtime" },
    ],
  },
  {
    key: CONFIG_KEYS.lowStockAlertEnabled,
    label: "Low-stock alerts",
    help: "Email administrators when items fall below their threshold.",
    type: "boolean",
  },
  {
    key: CONFIG_KEYS.autoGenerateMonthlyReport,
    label: "Auto-generate monthly reports",
    help: "Build the monthly summary report automatically.",
    type: "boolean",
  },
];

/** Admin-only editor for the SystemConfig key/value store. */
export function SystemConfigCard() {
  const { data, isLoading, isError, error, refetch } = useSystemConfig();
  const updateConfig = useUpdateSystemConfig();
  const [draft, setDraft] = React.useState<Record<string, unknown>>({});

  const valueOf = (key: string) => (key in draft ? draft[key] : data?.[key]);
  const dirty = Object.keys(draft).length > 0;

  const handleSave = () =>
    updateConfig.mutate(draft, {
      onSuccess: () => {
        toast.success("Settings saved");
        setDraft({});
      },
      onError: (err) => toast.error("Couldn't save settings", { description: getApiErrorMessage(err) }),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="text-primary size-4" />
          System settings
        </CardTitle>
        <CardDescription>
          Defaults that drive attendance, overtime, payroll and stock alerts across the whole system.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {FIELDS.map((field) => {
                const value = valueOf(field.key);
                return (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <Label htmlFor={field.key}>{field.label}</Label>

                    {field.type === "number" && (
                      <Input
                        id={field.key}
                        type="number"
                        min={field.min}
                        step={field.step}
                        value={value === undefined || value === null ? "" : String(value)}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            [field.key]: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                      />
                    )}

                    {field.type === "select" && (
                      <Select
                        value={value === undefined || value === null ? "" : String(value)}
                        onValueChange={(v) => setDraft((d) => ({ ...d, [field.key]: v }))}
                      >
                        <SelectTrigger id={field.key}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {field.type === "boolean" && (
                      <div className="flex h-9 items-center">
                        <Switch
                          id={field.key}
                          checked={value === true || value === "true"}
                          onCheckedChange={(checked) => setDraft((d) => ({ ...d, [field.key]: checked }))}
                        />
                      </div>
                    )}

                    <p className="text-muted-foreground text-xs">{field.help}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={!dirty || updateConfig.isPending}>
                {updateConfig.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save settings
              </Button>
              {dirty && (
                <Button variant="ghost" onClick={() => setDraft({})} disabled={updateConfig.isPending}>
                  Discard changes
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
