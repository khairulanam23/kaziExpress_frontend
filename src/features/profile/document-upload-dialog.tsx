"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, FileText, ImageIcon, Loader2, Upload, X } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFileObjectUrl } from "@/hooks/use-object-url";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { useUpdateDocument, useUploadDocument } from "@/hooks/queries/use-profile";
import { getApiErrorMessage } from "@/lib/api-client";
import { ACCEPTED_DOCUMENT_MIME, MAX_DOCUMENT_BYTES } from "@/services/profile.service";
import { cn, toDateInput } from "@/lib/utils";
import { DOCUMENT_TYPE_OPTIONS, type DocumentCategory, type LegalDocument } from "@/types";
import { formatFileSize } from "./document-helpers";

const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png";

/** Leading bytes each accepted format must start with. */
const MAGIC: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
};

/**
 * Client-side mirror of the backend's upload rules.
 *
 * This is a fast-feedback guard only — the server independently re-validates
 * type, extension, magic bytes and size on every upload and remains the
 * authority. The browser infers `file.type` from the extension, so the leading
 * bytes are checked here too; otherwise a renamed file looks valid until the
 * upload round-trips and fails.
 */
async function validateFile(file: File): Promise<string | null> {
  if (!ACCEPTED_DOCUMENT_MIME.includes(file.type as (typeof ACCEPTED_DOCUMENT_MIME)[number])) {
    return "Only PDF, JPG and PNG files are accepted.";
  }
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `That file is ${formatFileSize(file.size)}. The maximum accepted size is 10 MB.`;
  }

  const signatures = MAGIC[file.type];
  if (signatures) {
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const matches = signatures.some((sig) => sig.every((byte, i) => head[i] === byte));
    if (!matches) {
      const kind = file.type.split("/")[1].toUpperCase();
      return `That file isn't a valid ${kind}. Its contents don't match its extension.`;
    }
  }

  return null;
}

function FileDropZone({
  file,
  onFile,
  error,
  disabled,
}: {
  file: File | null;
  onFile: (file: File | null) => void | Promise<void>;
  error: string | null;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Local object URL so an image can be previewed before it is sent.
  const previewUrl = useFileObjectUrl(file && file.type.startsWith("image/") ? file : null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onFile(dropped);
  };

  if (file) {
    return (
      <div className="border-border flex items-center gap-3 rounded-xl border p-3">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
          <img src={previewUrl} alt="Selected file preview" className="size-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="bg-destructive-soft text-destructive flex size-16 shrink-0 items-center justify-center rounded-lg">
            <FileText className="size-7" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-muted-foreground text-xs">{formatFileSize(file.size)}</p>
          {error && (
            <p className="text-destructive mt-1 flex items-center gap-1 text-xs">
              <AlertTriangle className="size-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onFile(null)}
          disabled={disabled}
          aria-label="Remove selected file"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
        dragging ? "border-primary bg-primary-soft/40" : "border-border",
        disabled && "opacity-60",
      )}
    >
      <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full">
        <Upload className="size-5" />
      </span>
      <div>
        <p className="text-sm font-medium">Drag a file here, or</p>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          browse your device
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">PDF, JPG or PNG · up to 10 MB</p>
      {error && (
        <p className="text-destructive flex items-center gap-1 text-xs">
          <AlertTriangle className="size-3.5" />
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        aria-label="Choose a document to upload"
      />
    </div>
  );
}

export function DocumentUploadDialog({
  trigger,
  defaultCategory = "PERSONAL",
  /** When set, the dialog replaces this document's file instead of creating one. */
  replacing,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  trigger?: React.ReactNode;
  defaultCategory?: DocumentCategory;
  replacing?: LegalDocument | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;

  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [documentType, setDocumentType] = React.useState<string>("NID");
  const [category, setCategory] = React.useState<DocumentCategory>(defaultCategory);
  const [expiryDate, setExpiryDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [progress, setProgress] = React.useState(0);

  const upload = useUploadDocument();
  const update = useUpdateDocument();
  const isReplacing = !!replacing;
  const pending = upload.isPending || update.isPending;

  useResetOnOpen(open, () => {
    setFile(null);
    setFileError(null);
    setProgress(0);
    setName(replacing?.name ?? "");
    setDocumentType(replacing?.documentType ?? "NID");
    setCategory(replacing?.category ?? defaultCategory);
    setExpiryDate(replacing?.expiryDate ? toDateInput(new Date(replacing.expiryDate)) : "");
    setNotes(replacing?.notes ?? "");
  });

  const options = DOCUMENT_TYPE_OPTIONS.filter((o) => o.category === category);

  const handleFile = async (next: File | null) => {
    setFile(next);
    setFileError(null);
    // Offer the filename (without extension) as a starting document name.
    if (next && !name.trim()) {
      setName(next.name.replace(/\.[^.]+$/, "").slice(0, 60));
    }
    if (next) setFileError(await validateFile(next));
  };

  const canSubmit = name.trim().length > 0 && !fileError && (isReplacing || !!file) && !pending;

  const handleSubmit = () => {
    const payload = {
      name: name.trim(),
      documentType,
      category,
      expiryDate: expiryDate || null,
      notes: notes.trim() || null,
    };

    const onProgress = (percent: number) => setProgress(percent);

    if (isReplacing && replacing) {
      update.mutate(
        { id: replacing.id, payload, file: file ?? undefined, onProgress },
        {
          onSuccess: () => {
            toast.success(file ? "Document replaced" : "Document updated");
            setOpen(false);
          },
          onError: (error) => toast.error("Couldn't update document", { description: getApiErrorMessage(error) }),
        },
      );
      return;
    }

    if (!file) return;
    upload.mutate(
      { payload, file, onProgress },
      {
        onSuccess: () => {
          toast.success("Document uploaded", { description: `${name.trim()} is stored securely.` });
          setOpen(false);
        },
        onError: (error) => toast.error("Couldn't upload document", { description: getApiErrorMessage(error) }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isReplacing ? "Replace document" : "Upload document"}</DialogTitle>
          <DialogDescription>
            {isReplacing
              ? "Upload a new file to supersede the stored one, or just edit the details."
              : "Files are stored privately and are only readable by you and an administrator."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <FileDropZone file={file} onFile={handleFile} error={fileError} disabled={pending} />

          {pending && progress > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Uploading…</span>
                <span className="tabular font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-name">Document name *</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. National ID card"
              maxLength={160}
            />
            {!name.trim() && <p className="text-muted-foreground text-xs">Give it a name you&apos;ll recognise.</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  const next = v as DocumentCategory;
                  setCategory(next);
                  const first = DOCUMENT_TYPE_OPTIONS.find((o) => o.category === next);
                  if (first) setDocumentType(first.value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONAL">Personal</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Document type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-expiry">Expiry date</Label>
            <Input
              id="doc-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-52"
            />
            <p className="text-muted-foreground text-xs">Optional — leave blank if the document doesn&apos;t expire.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-notes">Notes</Label>
            <Textarea
              id="doc-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth recording about this document"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {isReplacing ? "Save changes" : "Upload document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ImageIcon };
