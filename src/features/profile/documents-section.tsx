"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileLock2, FolderOpen, Plus, ShieldCheck } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { ConfirmDialog, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeleteDocument } from "@/hooks/queries/use-profile";
import { getApiErrorMessage } from "@/lib/api-client";
import { profileService } from "@/services/profile.service";
import type { DocumentCategory, LegalDocument } from "@/types";
import { DocumentCard } from "./document-card";
import { DocumentPreviewModal } from "./document-preview-modal";
import { DocumentUploadDialog } from "./document-upload-dialog";

/** Illustration for the empty state — a padlocked folder, matching the tone. */
function EmptyDocumentsArt() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-auto" role="img" aria-label="No documents stored yet">
      <rect x="10" y="22" width="100" height="62" rx="8" fill="var(--muted)" />
      <path d="M10 30a8 8 0 0 1 8-8h26l8 10h50a8 8 0 0 1 8 8v6H10z" fill="var(--primary-soft)" />
      <rect x="30" y="42" width="60" height="38" rx="6" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
      <rect x="52" y="56" width="16" height="14" rx="3" fill="var(--primary)" />
      <path
        d="M55 56v-4a5 5 0 0 1 10 0v4"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Legal-document library for a profile.
 *
 * Documents are shown as visual cards with real thumbnails rather than a table
 * row, because recognising a scan at a glance is the common task here.
 */
export function DocumentsSection({
  documents,
  isLoading,
  isError,
  error,
  onRetry,
  readOnly = false,
  title = "Legal documents",
  description = "Identity and legal paperwork. Stored privately — only you and an administrator can open these.",
}: {
  documents: LegalDocument[];
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  readOnly?: boolean;
  title?: string;
  description?: string;
}) {
  const [tab, setTab] = React.useState<DocumentCategory | "ALL">("ALL");
  const [previewing, setPreviewing] = React.useState<LegalDocument | null>(null);
  const [replacing, setReplacing] = React.useState<LegalDocument | null>(null);
  const [deleting, setDeleting] = React.useState<LegalDocument | null>(null);

  const remove = useDeleteDocument();

  const filtered = React.useMemo(
    () => (tab === "ALL" ? documents : documents.filter((d) => d.category === tab)),
    [documents, tab],
  );

  const personalCount = documents.filter((d) => d.category === "PERSONAL").length;
  const businessCount = documents.filter((d) => d.category === "BUSINESS").length;
  const verifiedCount = documents.filter((d) => d.isVerified).length;

  const handleDownload = async (doc: LegalDocument) => {
    try {
      await profileService.downloadDocument(doc.id, doc.originalFileName ?? `${doc.name}.pdf`);
      toast.success("Document downloaded");
    } catch (err) {
      toast.error("Couldn't download document", { description: getApiErrorMessage(err) });
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Document deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error("Couldn't delete document", { description: getApiErrorMessage(err) }),
    });
  };

  return (
    <>
      <ChartCard
        title={title}
        description={description}
        action={
          !readOnly ? (
            <DocumentUploadDialog
              defaultCategory={tab === "BUSINESS" ? "BUSINESS" : "PERSONAL"}
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  Upload
                </Button>
              }
            />
          ) : undefined
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as DocumentCategory | "ALL")}>
              <TabsList>
                <TabsTrigger value="ALL">
                  All
                  {documents.length > 0 && <Badge variant="muted" className="ml-1.5">{documents.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="PERSONAL">
                  Personal
                  {personalCount > 0 && <Badge variant="muted" className="ml-1.5">{personalCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="BUSINESS">
                  Business
                  {businessCount > 0 && <Badge variant="muted" className="ml-1.5">{businessCount}</Badge>}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <FileLock2 className="size-3.5" />
                Private storage
              </span>
              {verifiedCount > 0 && (
                <span className="text-success flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" />
                  {verifiedCount} verified
                </span>
              )}
            </div>
          </div>

          {isError ? (
            <ErrorState error={error} onRetry={onRetry} />
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-border flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed py-12 text-center">
              <EmptyDocumentsArt />
              <div className="flex flex-col gap-1">
                <p className="font-medium">
                  {documents.length === 0 ? "No documents yet" : `No ${tab.toLowerCase()} documents`}
                </p>
                <p className="text-muted-foreground max-w-sm text-sm">
                  {readOnly
                    ? "This person hasn't uploaded any documents in this category."
                    : "Upload your NID, passport or other legal paperwork. Files stay private to you and administrators."}
                </p>
              </div>
              {!readOnly && (
                <DocumentUploadDialog
                  defaultCategory={tab === "BUSINESS" ? "BUSINESS" : "PERSONAL"}
                  trigger={
                    <Button size="sm">
                      <Plus className="size-4" />
                      Upload your first document
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  readOnly={readOnly}
                  onPreview={setPreviewing}
                  onDownload={handleDownload}
                  onEdit={readOnly ? undefined : setReplacing}
                  onReplace={readOnly ? undefined : setReplacing}
                  onDelete={readOnly ? undefined : setDeleting}
                />
              ))}
            </div>
          )}
        </div>
      </ChartCard>

      <DocumentPreviewModal
        document={previewing}
        open={!!previewing}
        onOpenChange={(open) => !open && setPreviewing(null)}
      />

      {replacing && (
        <DocumentUploadDialog
          replacing={replacing}
          open={!!replacing}
          onOpenChange={(open) => !open && setReplacing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this document?"
        description={`"${deleting?.name}" and its stored file will be permanently removed. This can't be undone.`}
        confirmLabel="Delete document"
        isPending={remove.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}

export { FolderOpen };
