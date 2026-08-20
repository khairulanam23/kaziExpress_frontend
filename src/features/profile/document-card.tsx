"use client";

import * as React from "react";
import { Download, Eye, MoreHorizontal, Pencil, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatDate } from "@/lib/utils";
import type { LegalDocument } from "@/types";
import {
  documentTypeLabel,
  documentVisual,
  formatFileSize,
  formatTag,
  isImageDocument,
  useDocumentObjectUrl,
} from "./document-helpers";

/**
 * Visual thumbnail for a document.
 *
 * Images render their real content so a page of documents is recognisable at a
 * glance; PDFs get a typed document mark rather than a generic file blob.
 */
function DocumentThumbnail({ document: doc }: { document: LegalDocument }) {
  const isImage = isImageDocument(doc.mimeType);
  const { url, isLoading } = useDocumentObjectUrl(doc.id, isImage);
  const { icon: Icon, tone } = documentVisual(doc.mimeType);

  if (isImage) {
    if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;
    if (url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL from the authenticated document endpoint
        <img
          src={url}
          alt={`Preview of ${doc.name}`}
          className="bg-muted h-32 w-full rounded-xl object-cover"
        />
      );
    }
  }

  return (
    <div className={cn("flex h-32 w-full items-center justify-center rounded-xl", tone)}>
      <div className="flex flex-col items-center gap-1.5">
        <Icon className="size-9" aria-hidden="true" />
        <span className="text-[10px] font-semibold tracking-wider uppercase">{formatTag(doc.mimeType)}</span>
      </div>
    </div>
  );
}

export function DocumentCard({
  document: doc,
  onPreview,
  onReplace,
  onEdit,
  onDelete,
  onDownload,
  readOnly = false,
}: {
  document: LegalDocument;
  onPreview: (doc: LegalDocument) => void;
  onReplace?: (doc: LegalDocument) => void;
  onEdit?: (doc: LegalDocument) => void;
  onDelete?: (doc: LegalDocument) => void;
  onDownload: (doc: LegalDocument) => void;
  readOnly?: boolean;
}) {
  const expiring = doc.expiryDate ? new Date(doc.expiryDate) < new Date() : false;

  return (
    <Card className="card-glow group gap-0 overflow-hidden p-0 transition-shadow">
      <button
        type="button"
        onClick={() => onPreview(doc)}
        className="focus-visible:ring-ring/50 relative block w-full cursor-pointer p-3 pb-0 text-left focus-visible:ring-2 focus-visible:outline-none"
        aria-label={`Preview ${doc.name}`}
      >
        <DocumentThumbnail document={doc} />
        <span className="bg-foreground/0 group-hover:bg-foreground/35 absolute inset-3 bottom-0 flex items-center justify-center rounded-xl transition-colors">
          <span className="text-background scale-90 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
            <Eye className="size-6" />
          </span>
        </span>
      </button>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" title={doc.name}>
              {doc.name}
            </p>
            <p className="text-muted-foreground truncate text-xs">{documentTypeLabel(doc.documentType)}</p>
          </div>

          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${doc.name}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPreview(doc)}>
                  <Eye className="size-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload(doc)}>
                  <Download className="size-4" />
                  Download
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(doc)}>
                    <Pencil className="size-4" />
                    Edit details
                  </DropdownMenuItem>
                )}
                {onReplace && (
                  <DropdownMenuItem onClick={() => onReplace(doc)}>
                    <RefreshCw className="size-4" />
                    Replace file
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(doc)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{formatTag(doc.mimeType)}</Badge>
          <Badge variant="muted">{formatFileSize(doc.fileSize)}</Badge>
          {doc.isVerified && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="success">
                  <ShieldCheck />
                  Verified
                </Badge>
              </TooltipTrigger>
              <TooltipContent>An administrator has verified this document</TooltipContent>
            </Tooltip>
          )}
          {expiring && <Badge variant="destructive">Expired</Badge>}
        </div>

        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>Uploaded {formatDate(doc.uploadedAt)}</span>
          {doc.expiryDate && !expiring && <span>Expires {formatDate(doc.expiryDate)}</span>}
        </div>

        <div className="flex gap-1.5 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onPreview(doc)}>
            <Eye className="size-3.5" />
            View
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onDownload(doc)}>
            <Download className="size-3.5" />
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
