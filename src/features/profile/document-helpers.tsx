"use client";

import * as React from "react";
import { FileImage, FileText, FileQuestion, type LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { profileService } from "@/services/profile.service";
import { DOCUMENT_TYPE_OPTIONS } from "@/types";

/** Human label for a stored document-type slug, tolerating unknown values. */
export function documentTypeLabel(value: string): string {
  const known = DOCUMENT_TYPE_OPTIONS.find((o) => o.value === value);
  if (known) return known.label;
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isImageDocument(mimeType: string | null | undefined): boolean {
  return !!mimeType?.startsWith("image/");
}

export function isPdfDocument(mimeType: string | null | undefined): boolean {
  return mimeType === "application/pdf";
}

/** Icon and colour treatment per file kind. */
export function documentVisual(mimeType: string | null | undefined): {
  icon: LucideIcon;
  tone: string;
  label: string;
} {
  if (isImageDocument(mimeType)) {
    return { icon: FileImage, tone: "text-secondary bg-secondary-soft", label: "Image" };
  }
  if (isPdfDocument(mimeType)) {
    return { icon: FileText, tone: "text-destructive bg-destructive-soft", label: "PDF" };
  }
  return { icon: FileQuestion, tone: "text-muted-foreground bg-muted", label: "File" };
}

/** Short format tag, e.g. "PDF", "PNG". */
export function formatTag(mimeType: string | null | undefined): string {
  if (!mimeType) return "FILE";
  const sub = mimeType.split("/")[1] ?? "file";
  return (sub === "jpeg" ? "jpg" : sub).toUpperCase();
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Loads a private document's bytes as an object URL.
 *
 * Documents are only readable with a bearer token, so an `<img src>` pointed
 * at the API would 401. The bytes are fetched through the authenticated client
 * and exposed as a blob URL.
 *
 * React Query owns the async lifecycle (so there is no state-setting effect),
 * and a cleanup effect revokes the URL when the component unmounts or moves to
 * a different document, so nothing leaks.
 */
export function useDocumentObjectUrl(documentId: string | null, enabled = true) {
  const query = useQuery({
    queryKey: ["profile", "documents", "blob", documentId],
    queryFn: async () => {
      const { url } = await profileService.previewUrl(documentId as string);
      return url;
    },
    enabled: !!documentId && enabled,
    // Blob URLs are tied to this document; don't reuse them across ids.
    gcTime: 0,
    staleTime: Infinity,
    retry: false,
  });

  const url = query.data ?? null;

  React.useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return { url, isLoading: query.isLoading, error: query.isError ? query.error : null };
}
