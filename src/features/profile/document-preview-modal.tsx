"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/shared/states";
import { getApiErrorMessage } from "@/lib/api-client";
import { profileService } from "@/services/profile.service";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { LegalDocument } from "@/types";
import {
  documentTypeLabel,
  formatFileSize,
  formatTag,
  isImageDocument,
  isPdfDocument,
  useDocumentObjectUrl,
} from "./document-helpers";

/**
 * Full preview for a stored document.
 *
 * The bytes are private, so they are streamed through the authenticated
 * endpoint into a blob URL rather than linked directly — images render inline
 * and PDFs open in an embedded viewer.
 */
export function DocumentPreviewModal({
  document: doc,
  open,
  onOpenChange,
}: {
  document: LegalDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { url, isLoading, error } = useDocumentObjectUrl(open && doc ? doc.id : null);
  const [downloading, setDownloading] = React.useState(false);

  if (!doc) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await profileService.downloadDocument(doc.id, doc.originalFileName ?? `${doc.name}.pdf`);
      toast.success("Document downloaded");
    } catch (err) {
      toast.error("Couldn't download document", { description: getApiErrorMessage(err) });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{doc.name}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="default">{documentTypeLabel(doc.documentType)}</Badge>
              <Badge variant="outline">{formatTag(doc.mimeType)}</Badge>
              <Badge variant="muted">{formatFileSize(doc.fileSize)}</Badge>
              {doc.isVerified && <Badge variant="success">Verified</Badge>}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 flex min-h-72 flex-1 items-center justify-center overflow-auto rounded-xl p-2">
          {isLoading ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm">Loading document…</p>
            </div>
          ) : error ? (
            <ErrorState error={error} />
          ) : !url ? null : isImageDocument(doc.mimeType) ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL, not a static asset
            <img src={url} alt={doc.name} className="max-h-[62vh] w-auto rounded-lg object-contain" />
          ) : isPdfDocument(doc.mimeType) ? (
            <iframe src={url} title={`${doc.name} preview`} className="h-[62vh] w-full rounded-lg border-0" />
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10">
              <FileText className="size-8" />
              <p className="text-sm">This format can&apos;t be previewed. Download it to open.</p>
            </div>
          )}
        </div>

        <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          <div>
            <span className="block font-medium">File</span>
            <span className="truncate">{doc.originalFileName ?? "—"}</span>
          </div>
          <div>
            <span className="block font-medium">Uploaded</span>
            <span>{formatDateTime(doc.uploadedAt)}</span>
          </div>
          <div>
            <span className="block font-medium">Last updated</span>
            <span>{formatDateTime(doc.updatedAt)}</span>
          </div>
          <div>
            <span className="block font-medium">Expires</span>
            <span>{doc.expiryDate ? formatDate(doc.expiryDate) : "No expiry"}</span>
          </div>
        </div>

        {doc.notes && <p className="text-muted-foreground text-xs">{doc.notes}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
