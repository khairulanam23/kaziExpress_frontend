"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUpsertRecord } from "@/hooks/queries/use-content-types";
import { getApiErrorMessage } from "@/lib/api-client";
import type { ContentField, EmployeeRecordGroup } from "@/services/content-types.service";

/**
 * Dynamic employee records driven by admin-defined content types.
 * Extracted from the profile page so the page itself stays a composition of
 * sections rather than a single very large file.
 */

// ── Dynamic field renderer ────────────────────────────────────────────────
function DynamicFieldInput({
  field,
  value,
  onChange,
}: {
  field: ContentField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const strVal = value != null ? String(value) : "";
  const id = `dyn-field-${field.id}`;

  if (field.fieldType === "textarea") {
    return (
      <Textarea
        id={id}
        placeholder={field.placeholder ?? undefined}
        value={strVal}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if ((field.fieldType === "dropdown" || field.fieldType === "radio") && field.options?.length) {
    const opts = field.options as { label: string; value: string }[];
    return (
      <Select value={strVal} onValueChange={onChange}>
        <SelectTrigger id={id}><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent>
          {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (field.fieldType === "checkbox") {
    return (
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id={id}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 cursor-pointer"
        />
        <label htmlFor={id} className="text-sm cursor-pointer">{field.label}</label>
      </div>
    );
  }
  const inputType = (
    field.fieldType === "number" ? "number"
    : field.fieldType === "email" ? "email"
    : field.fieldType === "phone" ? "tel"
    : field.fieldType === "date" ? "date"
    : "text"
  );
  return (
    <Input
      id={id}
      type={inputType}
      placeholder={field.placeholder ?? undefined}
      value={strVal}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ── Single dynamic content type card (editable) ───────────────────────────
export function DynamicRecordCard({
  group,
  scrollRef,
}: {
  group: EmployeeRecordGroup;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { contentType, record } = group;
  const upsert = useUpsertRecord(); // no userId → own record

  // Local form state, initialised from the saved record
  const [formData, setFormData] = React.useState<Record<string, unknown>>(
    (record?.data as Record<string, unknown>) ?? {}
  );
  const [dirty, setDirty] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  // Re-seed from the server copy whenever it changes (e.g. after a save
  // elsewhere invalidates the query). Comparing against the previous value
  // during render avoids the extra render pass an effect would cause.
  const [syncedRecord, setSyncedRecord] = React.useState(record);
  if (syncedRecord !== record) {
    setSyncedRecord(record);
    setFormData((record?.data as Record<string, unknown>) ?? {});
    setDirty(false);
  }

  const handleChange = (fieldId: string, val: unknown) => {
    setFormData((d) => ({ ...d, [fieldId]: val }));
    setDirty(true);
  };

  const handleSave = () => {
    upsert.mutate(
      { contentTypeId: contentType.id, data: formData },
      {
        onSuccess: () => {
          toast.success(`${contentType.name} saved`);
          setDirty(false);
        },
        onError: (e) => toast.error("Save failed", { description: getApiErrorMessage(e) }),
      }
    );
  };

  // Count missing required fields for badge
  const missingCount = contentType.fields.filter((f) => {
    if (!f.required) return false;
    const v = formData[f.id];
    return v == null || v === "" || v === false;
  }).length;

  return (
    <div ref={scrollRef as React.RefObject<HTMLDivElement>} className="rounded-xl border border-border overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border cursor-pointer select-none"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-sm font-semibold">{contentType.name}</p>
            {contentType.description && (
              <p className="text-[11px] text-muted-foreground">{contentType.description}</p>
            )}
          </div>
          {missingCount > 0 && (
            <Badge variant="warning" className="text-[10px]">
              <AlertTriangle className="size-2.5" />
              {missingCount} required
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-[10px] text-warning font-medium">Unsaved changes</span>
          )}
          {collapsed
            ? <ChevronDown className="size-4 text-muted-foreground" />
            : <ChevronUp className="size-4 text-muted-foreground" />
          }
        </div>
      </div>

      {/* Fields */}
      {!collapsed && (
        <div className="p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {contentType.fields.map((field) => (
              <div
                key={field.id}
                className={
                  field.fieldType === "textarea" ? "sm:col-span-2 flex flex-col gap-1.5"
                  : field.fieldType === "checkbox" ? "flex flex-col gap-1.5"
                  : "flex flex-col gap-1.5"
                }
              >
                {field.fieldType !== "checkbox" && (
                  <Label htmlFor={`dyn-field-${field.id}`} className="text-sm flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive text-xs">*</span>}
                  </Label>
                )}
                <DynamicFieldInput
                  field={field}
                  value={formData[field.id]}
                  onChange={(v) => handleChange(field.id, v)}
                />
                {field.helpText && (
                  <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
                )}
              </div>
            ))}
          </div>

          <div>
            <Button onClick={handleSave} disabled={upsert.isPending || !dirty} size="sm">
              {upsert.isPending
                ? <Loader2 className="size-3.5 animate-spin mr-1.5" />
                : <Save className="size-3.5 mr-1.5" />}
              Save {contentType.name}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Incomplete required fields alert banner ───────────────────────────────
export function IncompleteFieldsAlert({
  groups,
  onScrollTo,
}: {
  groups: EmployeeRecordGroup[];
  onScrollTo: (contentTypeId: string) => void;
}) {
  // Compute which groups have unfilled required fields
  const incomplete = groups.filter(({ contentType, record }) =>
    contentType.fields.some((f) => {
      if (!f.required) return false;
      const data = (record?.data as Record<string, unknown>) ?? {};
      const v = data[f.id];
      return v == null || v === "" || v === false;
    })
  );

  if (incomplete.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/8 p-4">
      <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-warning">Some profile fields need to be filled</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">
          The following sections have required fields that are empty:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {incomplete.map(({ contentType }) => (
            <button
              key={contentType.id}
              onClick={() => onScrollTo(contentType.id)}
              className="text-[11px] font-medium text-warning underline underline-offset-2 decoration-warning/50 hover:decoration-warning transition-colors"
            >
              {contentType.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

