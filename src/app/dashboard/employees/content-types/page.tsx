"use client";

import * as React from "react";
import {
  Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronUp,
  GripVertical, X, Lock, ShieldCheck,
} from "lucide-react";
import { SectionHeader } from "@/components/shared/chart-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useContentTypes,
  useCreateContentType,
  useUpdateContentType,
  useDeleteContentType,
} from "@/hooks/queries/use-content-types";
import { getApiErrorMessage } from "@/lib/api-client";
import type { ContentType, ContentField, FieldType } from "@/services/content-types.service";

// ── System (core) fields ──────────────────────────────────────────────────
// These reflect the hard-coded User + EmployeeProfile DB columns.
// They are READ-ONLY and cannot be edited or deleted.
const SYSTEM_FIELDS: { label: string; fieldType: string; required: boolean; note?: string }[] = [
  { label: "Full Name",    fieldType: "text",   required: false },
  { label: "Email Address",fieldType: "email",  required: true, note: "Unique identifier" },
  { label: "Phone Number", fieldType: "phone",  required: false },
  { label: "Address",      fieldType: "text",   required: false },
  { label: "Role",         fieldType: "text",   required: true, note: "ADMIN / EMPLOYEE" },
  { label: "Department",   fieldType: "text",   required: false, note: "Employee profile" },
  { label: "Join Date",    fieldType: "date",   required: false, note: "Employee profile" },
  { label: "Hourly Rate",  fieldType: "number", required: true,  note: "Employee profile" },
  { label: "Daily Rate",   fieldType: "number", required: false, note: "Employee profile" },
  { label: "Pay Mode",     fieldType: "text",   required: true,  note: "HOURLY / DAILY_PLUS_OVERTIME" },
  { label: "OT Multiplier",fieldType: "number", required: true,  note: "Employee profile" },
];

// ── Field type options ────────────────────────────────────────────────────
const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "text",     label: "Text" },
  { value: "number",   label: "Number" },
  { value: "email",    label: "Email" },
  { value: "phone",    label: "Phone" },
  { value: "date",     label: "Date" },
  { value: "textarea", label: "Text Area" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio",    label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file",     label: "File" },
];

type DraftField = Omit<ContentField, "id" | "contentTypeId" | "createdAt" | "updatedAt"> & {
  id?: string;
  _key?: string;
};

const emptyField = (): DraftField => ({
  _key:        Math.random().toString(36).slice(2),
  label:       "",
  fieldType:   "text",
  required:    false,
  order:       0,
  options:     null,
  placeholder: null,
  helpText:    null,
});

// ── Shared field row (used in both create and add-field dialogs) ───────────
function FieldRow({
  field, idx, total, onChange, onRemove, onMoveUp, onMoveDown,
}: {
  field: DraftField; idx: number; total: number;
  onChange: (f: DraftField) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const needsOptions = field.fieldType === "dropdown" || field.fieldType === "radio";
  const optionsStr = field.options ? field.options.map((o) => o.label).join(", ") : "";

  return (
    <div className="border border-border rounded-xl p-4 flex flex-col gap-3 bg-muted/10">
      <div className="flex items-center gap-2">
        <GripVertical className="size-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
        <div className="flex-1 grid grid-cols-2 gap-2">
          <Input
            placeholder="Field label *"
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
            className="text-sm"
          />
          <Select
            value={field.fieldType}
            onValueChange={(v) => onChange({ ...field, fieldType: v as FieldType, options: null })}
          >
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIELD_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button type="button" variant="ghost" size="icon-sm" onClick={onMoveUp} disabled={idx === 0}>
            <ChevronUp className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onMoveDown} disabled={idx === total - 1}>
            <ChevronDown className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={onRemove}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pl-6">
        <Input
          placeholder="Placeholder (optional)"
          value={field.placeholder ?? ""}
          onChange={(e) => onChange({ ...field, placeholder: e.target.value || null })}
          className="text-xs"
        />
        <Input
          placeholder="Help text (optional)"
          value={field.helpText ?? ""}
          onChange={(e) => onChange({ ...field, helpText: e.target.value || null })}
          className="text-xs"
        />
      </div>
      {needsOptions && (
        <div className="pl-6">
          <Input
            placeholder="Options (comma-separated): e.g. Savings, Current, Business"
            value={optionsStr}
            onChange={(e) => {
              const parts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
              onChange({
                ...field,
                options: parts.map((p) => ({ label: p, value: p.toLowerCase().replace(/\s+/g, "_") })),
              });
            }}
            className="text-xs"
          />
        </div>
      )}
      <div className="pl-6 flex items-center gap-2">
        <input
          type="checkbox"
          id={`req-${field._key}`}
          checked={field.required}
          onChange={(e) => onChange({ ...field, required: e.target.checked })}
          className="size-3.5 cursor-pointer"
        />
        <label htmlFor={`req-${field._key}`} className="text-xs text-muted-foreground cursor-pointer">
          Required field
        </label>
      </div>
    </div>
  );
}

// ── Create / Edit Content Type Dialog ────────────────────────────────────
function ContentTypeDialog({
  open, onOpenChange, existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing: ContentType | null;
}) {
  const create = useCreateContentType();
  const update = useUpdateContentType();
  const isPending = create.isPending || update.isPending;

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [fields, setFields] = React.useState<DraftField[]>([emptyField()]);

  const [prevExisting, setPrevExisting] = React.useState<ContentType | null>(null);
  const [prevOpen, setPrevOpen] = React.useState(false);

  if (existing !== prevExisting || open !== prevOpen) {
    setPrevExisting(existing);
    setPrevOpen(open);
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setFields(existing.fields.map((f) => ({ ...f, _key: f.id })));
    } else {
      setName("");
      setDescription("");
      setFields([emptyField()]);
    }
  }

  const addField    = () => setFields((f) => [...f, { ...emptyField(), order: f.length }]);
  const removeField = (idx: number) => setFields((f) => f.filter((_, i) => i !== idx));
  const updateField = (idx: number, val: DraftField) => setFields((f) => f.map((x, i) => i === idx ? val : x));
  const moveUp      = (idx: number) => { if (idx === 0) return; setFields((f) => { const a = [...f]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; }); };
  const moveDown    = (idx: number) => { if (idx === fields.length - 1) return; setFields((f) => { const a = [...f]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; }); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (fields.some((f) => !f.label.trim())) { toast.error("All field labels are required"); return; }

    const fieldPayload = fields.map((f, i) => {
      const copy = { ...f };
      delete copy._key;
      return { ...copy, order: i };
    });

    if (existing) {
      update.mutate(
        { id: existing.id, payload: { name, description: description || null, fields: fieldPayload } },
        {
          onSuccess: () => { toast.success("Content type updated"); onOpenChange(false); },
          onError:   (e) => toast.error("Failed", { description: getApiErrorMessage(e) }),
        }
      );
    } else {
      create.mutate(
        { name, description: description || null, fields: fieldPayload },
        {
          onSuccess: () => { toast.success("Content type created"); onOpenChange(false); },
          onError:   (e) => toast.error("Failed", { description: getApiErrorMessage(e) }),
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Content Type" : "New Content Type"}</DialogTitle>
          <DialogDescription>Define a schema that employees can fill in from their profile.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Name *</Label>
              <Input placeholder="e.g. Bank Information" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description (optional)</Label>
              <Input placeholder="e.g. Employee bank account details" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                <Plus className="size-3.5 mr-1" /> Add field
              </Button>
            </div>
            {fields.map((field, idx) => (
              <FieldRow
                key={field._key} field={field} idx={idx} total={fields.length}
                onChange={(v) => updateField(idx, v)}
                onRemove={() => removeField(idx)}
                onMoveUp={() => moveUp(idx)}
                onMoveDown={() => moveDown(idx)}
              />
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              {existing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Field to Existing Content Type Dialog ─────────────────────────────
// Per the spec: admin selects an existing content type from a dropdown,
// then adds new field(s) — existing fields are preserved via their IDs.
function AddFieldDialog({
  open, onOpenChange, contentTypes, defaultContentTypeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contentTypes: ContentType[];
  defaultContentTypeId?: string;
}) {
  const update = useUpdateContentType();
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [newFields, setNewFields] = React.useState<DraftField[]>([emptyField()]);

  const [prevOpen, setPrevOpen] = React.useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelectedId(defaultContentTypeId ?? "");
      setNewFields([emptyField()]);
    }
  }

  const selectedCT = contentTypes.find((ct) => ct.id === selectedId) ?? null;

  const addField    = () => setNewFields((f) => [...f, { ...emptyField(), order: f.length }]);
  const removeField = (idx: number) => setNewFields((f) => f.filter((_, i) => i !== idx));
  const updateField = (idx: number, val: DraftField) => setNewFields((f) => f.map((x, i) => i === idx ? val : x));
  const moveUp      = (idx: number) => { if (idx === 0) return; setNewFields((f) => { const a = [...f]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; }); };
  const moveDown    = (idx: number) => { if (idx === newFields.length - 1) return; setNewFields((f) => { const a = [...f]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; }); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) { toast.error("Please select a content type"); return; }
    if (newFields.some((f) => !f.label.trim())) { toast.error("All field labels are required"); return; }

    // Preserve existing fields (send them with their IDs so they're updated, not deleted)
    const existingFieldPayload = (selectedCT?.fields ?? []).map((f) => ({
      id:          f.id,
      label:       f.label,
      fieldType:   f.fieldType as FieldType,
      required:    f.required,
      order:       f.order,
      options:     f.options as { label: string; value: string }[] | null,
      placeholder: f.placeholder,
      helpText:    f.helpText,
    }));

    // New fields have no ID — service will create them
    const newFieldPayload = newFields.map((f, i) => {
      const copy = { ...f };
      delete copy._key;
      delete copy.id;
      return { ...copy, order: existingFieldPayload.length + i };
    });

    update.mutate(
      { id: selectedId, payload: { fields: [...existingFieldPayload, ...newFieldPayload] } },
      {
        onSuccess: () => {
          toast.success(`Field${newFields.length > 1 ? "s" : ""} added to "${selectedCT?.name}"`);
          onOpenChange(false);
        },
        onError: (e) => toast.error("Failed", { description: getApiErrorMessage(e) }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Field to Existing Content Type</DialogTitle>
          <DialogDescription>
            Select an existing content type, then define the new field(s) to add. Existing fields are preserved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Content type selector */}
          <div className="flex flex-col gap-1.5">
            <Label>Content Type *</Label>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={!!defaultContentTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a content type…" />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((ct) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    <span className="font-medium">{ct.name}</span>
                    <span className="text-muted-foreground ml-1.5 text-xs">
                      ({ct.fields.length} field{ct.fields.length !== 1 ? "s" : ""})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show existing fields as read-only preview */}
          {selectedCT && selectedCT.fields.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Existing fields (preserved)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedCT.fields.map((f) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                  >
                    <Lock className="size-2.5" />
                    {f.label}
                    <span className="opacity-60">({f.fieldType})</span>
                    {f.required && <span className="text-destructive">*</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* New fields builder */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">New Field{newFields.length > 1 ? "s" : ""}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                <Plus className="size-3.5 mr-1" /> Add another
              </Button>
            </div>
            {newFields.map((field, idx) => (
              <FieldRow
                key={field._key} field={field} idx={idx} total={newFields.length}
                onChange={(v) => updateField(idx, v)}
                onRemove={() => removeField(idx)}
                onMoveUp={() => moveUp(idx)}
                onMoveDown={() => moveDown(idx)}
              />
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={update.isPending || !selectedId}>
              {update.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Add field{newFields.length > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── System Fields Card ────────────────────────────────────────────────────
function SystemFieldsCard() {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Core Employee Fields</CardTitle>
              <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                <ShieldCheck className="size-3" /> System
              </Badge>
            </div>
            <CardDescription className="mt-0.5">
              Built-in fields from the employee database. These cannot be edited or removed.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs shrink-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="size-3.5 mr-1" /> : <ChevronDown className="size-3.5 mr-1" />}
            {expanded ? "Hide" : "View"} fields
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1.5">
            {SYSTEM_FIELDS.map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full border border-border/40"
                title={f.note}
              >
                <Lock className="size-2.5 shrink-0" />
                {f.label}
                <span className="opacity-50">({f.fieldType})</span>
                {f.required && <span className="text-destructive ml-0.5">*</span>}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            <span className="text-destructive">*</span> = required
          </p>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function ContentTypesPage() {
  const { data: contentTypes, isLoading } = useContentTypes(true);
  const deleteContentType = useDeleteContentType();

  const [ctDialogOpen, setCtDialogOpen]       = React.useState(false);
  const [addFieldDialogOpen, setAddFieldDialogOpen] = React.useState(false);
  const [selectedCtIdForAddField, setSelectedCtIdForAddField] = React.useState<string | undefined>(undefined);
  const [editing, setEditing]                 = React.useState<ContentType | null>(null);

  const activeContentTypes = (contentTypes ?? []).filter((ct) => ct.isActive);

  const openCreate = () => { setEditing(null); setCtDialogOpen(true); };
  const openEdit   = (ct: ContentType) => { setEditing(ct); setCtDialogOpen(true); };

  const openAddField = (ctId?: string) => {
    setSelectedCtIdForAddField(ctId);
    setAddFieldDialogOpen(true);
  };

  const handleDelete = (ct: ContentType) => {
    if (!window.confirm(
      `Delete "${ct.name}"?\n\nThis will permanently remove the content type and all employee records saved for it.`
    )) return;
    deleteContentType.mutate(ct.id, {
      onSuccess: () => toast.success(`"${ct.name}" deleted`),
      onError:   (e) => toast.error("Failed to delete", { description: getApiErrorMessage(e) }),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Content Types"
        description="Manage the dynamic information schemas employees fill in — e.g. Bank Information, Emergency Contacts."
        action={
          <div className="flex items-center gap-2">
            {/* Add field to existing type (per spec req #3) */}
            {activeContentTypes.length > 0 && (
              <Button variant="outline" onClick={() => openAddField(undefined)}>
                <Plus className="size-4 mr-1.5" /> Add field
              </Button>
            )}
            <Button onClick={openCreate}>
              <Plus className="size-4 mr-1.5" /> New content type
            </Button>
          </div>
        }
      />

      {/* ── System Fields (always shown first, read-only) ── */}
      <SystemFieldsCard />

      {/* ── Dynamic Content Types ── */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : !contentTypes?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-base font-semibold">No custom content types yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Create your first content type to let employees fill in additional structured
              information like bank details or emergency contacts.
            </p>
            <Button onClick={openCreate} className="mt-2">
              <Plus className="size-4 mr-1.5" /> New content type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {contentTypes.map((ct) => (
            <Card key={ct.id} className={ct.isActive ? "" : "opacity-55"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{ct.name}</CardTitle>
                      {!ct.isActive && (
                        <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                      )}
                    </div>
                    {ct.description && (
                      <CardDescription className="mt-0.5">{ct.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ct.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => openAddField(ct.id)}
                      >
                        <Plus className="size-3 mr-1" /> Add field
                      </Button>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {ct.fields.length} field{ct.fields.length !== 1 ? "s" : ""}
                    </Badge>
                    {ct._count != null && (
                      <Badge variant="outline" className="text-xs">
                        {ct._count.records} record{ct._count.records !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(ct)} title="Edit">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      className="text-destructive"
                      disabled={deleteContentType.isPending}
                      onClick={() => handleDelete(ct)}
                      title="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {ct.fields.length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {ct.fields.map((f) => (
                      <span
                        key={f.id}
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                      >
                        {f.label}
                        <span className="text-[10px] opacity-60">({f.fieldType})</span>
                        {f.required && <span className="text-destructive">*</span>}
                      </span>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
      <ContentTypeDialog
        open={ctDialogOpen}
        onOpenChange={setCtDialogOpen}
        existing={editing}
      />

      <AddFieldDialog
        open={addFieldDialogOpen}
        onOpenChange={setAddFieldDialogOpen}
        contentTypes={activeContentTypes}
        defaultContentTypeId={selectedCtIdForAddField}
      />
    </div>
  );
}
