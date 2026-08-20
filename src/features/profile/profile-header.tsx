"use client";

import * as React from "react";
import { toast } from "sonner";
import { Camera, Loader2, Mail, Phone, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/shared/initials-avatar";
import { EmployeeActiveBadge, RoleBadge } from "@/components/shared/status-badges";
import { ConfirmDialog } from "@/components/shared/states";
import { useFileObjectUrl } from "@/hooks/use-object-url";
import { useResetOnOpen } from "@/hooks/use-reset-on-open";
import { useRemoveAvatar, useUploadAvatar } from "@/hooks/queries/use-profile";
import { getApiErrorMessage } from "@/lib/api-client";
import { ACCEPTED_IMAGE_MIME, MAX_IMAGE_BYTES } from "@/services/profile.service";
import { cn, formatDate } from "@/lib/utils";
import type { Profile } from "@/types";
import { formatFileSize } from "./document-helpers";

/** Client-side mirror of the backend's image rules; the server re-validates. */
function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_MIME.includes(file.type as (typeof ACCEPTED_IMAGE_MIME)[number])) {
    return "Choose a JPG, PNG or WebP image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `That image is ${formatFileSize(file.size)}. The maximum is 5 MB.`;
  }
  return null;
}

/** Upload dialog with a live preview of the chosen photo before it is saved. */
function AvatarDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar();

  const previewUrl = useFileObjectUrl(file);

  useResetOnOpen(open, () => {
    setFile(null);
    setError(null);
    setProgress(0);
  });

  const choose = (next: File | null) => {
    setFile(next);
    setError(next ? validateImage(next) : null);
  };

  const handleSave = () => {
    if (!file || error) return;
    upload.mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: () => {
          toast.success("Profile photo updated");
          onOpenChange(false);
        },
        onError: (err) => toast.error("Couldn't update photo", { description: getApiErrorMessage(err) }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile photo</DialogTitle>
          <DialogDescription>Choose a clear, front-facing photo. JPG, PNG or WebP up to 5 MB.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) choose(dropped);
            }}
            className={cn(
              "flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 transition-colors",
              dragging ? "border-primary bg-primary-soft/40" : "border-border",
            )}
          >
            <UserAvatar
              name={profile.name ?? profile.email}
              imageUrl={previewUrl ?? profile.avatarUrl}
              size="size-28"
              className="shadow-lg"
            />
            <div className="text-center">
              <p className="text-sm font-medium">{file ? "New photo selected" : "Drag a photo here, or"}</p>
              <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => inputRef.current?.click()}>
                browse your device
              </Button>
            </div>
            {file && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground max-w-40 truncate">{file.name}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => choose(null)} aria-label="Clear selection">
                  <X className="size-3.5" />
                </Button>
              </div>
            )}
            {error && <p className="text-destructive text-xs">{error}</p>}
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="sr-only"
              onChange={(e) => choose(e.target.files?.[0] ?? null)}
              aria-label="Choose a profile photo"
            />
          </div>

          {upload.isPending && progress > 0 && (
            <div className="w-full">
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!file || !!error || upload.isPending}>
            {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Save photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Identity banner for a profile: photo, name, role, employment details and the
 * contact lines, with photo management for the signed-in user's own profile.
 */
export function ProfileHeader({ profile, editable = true }: { profile: Profile; editable?: boolean }) {
  const [photoOpen, setPhotoOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const removeAvatar = useRemoveAvatar();

  const displayName = profile.name ?? profile.email;
  const employeeId = profile.id.slice(0, 8).toUpperCase();
  const employment = profile.employeeProfile;

  return (
    <>
      <Card className="stat-card relative overflow-hidden p-0">
        {/* Brand wash behind the identity block. */}
        <div className="from-primary/12 via-accent/8 h-24 w-full bg-linear-to-r to-transparent" aria-hidden="true" />

        <div className="flex flex-col gap-5 px-5 pb-5 sm:flex-row sm:items-end sm:gap-6 sm:px-7 sm:pb-6">
          <div className="-mt-14 shrink-0 sm:-mt-16">
            <div className="relative w-fit">
              <UserAvatar
                name={displayName}
                imageUrl={profile.avatarUrl}
                size="size-28 sm:size-32"
                className="ring-card shadow-xl ring-4"
              />
              {editable && (
                <button
                  type="button"
                  onClick={() => setPhotoOpen(true)}
                  className="bg-primary text-primary-foreground ring-card hover:bg-primary/90 focus-visible:ring-ring absolute right-1 bottom-1 flex size-9 cursor-pointer items-center justify-center rounded-full shadow-md ring-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  aria-label="Change profile photo"
                  title="Change profile photo"
                >
                  <Camera className="size-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{displayName}</h2>
                <RoleBadge role={profile.role} />
                <EmployeeActiveBadge isActive={profile.isActive} />
              </div>

              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="tabular flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" />
                  ID {employeeId}
                </span>
                {employment?.designation && <span>{employment.designation}</span>}
                {employment?.department && <span>· {employment.department}</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted" className="gap-1.5 px-2.5 py-1">
                <Mail className="size-3.5" />
                <span className="max-w-52 truncate">{profile.email}</span>
              </Badge>
              {profile.phone && (
                <Badge variant="muted" className="gap-1.5 px-2.5 py-1">
                  <Phone className="size-3.5" />
                  {profile.phone}
                </Badge>
              )}
              {employment?.joinDate && (
                <Badge variant="secondary" className="px-2.5 py-1">
                  Joined {formatDate(employment.joinDate)}
                </Badge>
              )}
            </div>
          </div>

          {editable && (
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => setPhotoOpen(true)}>
                <Camera className="size-4" />
                {profile.avatarUrl ? "Change photo" : "Add photo"}
              </Button>
              {profile.avatarUrl && (
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setRemoveOpen(true)}
                  aria-label="Remove profile photo"
                  title="Remove photo"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {editable && (
        <>
          <AvatarDialog profile={profile} open={photoOpen} onOpenChange={setPhotoOpen} />
          <ConfirmDialog
            open={removeOpen}
            onOpenChange={setRemoveOpen}
            title="Remove your profile photo?"
            description="Your avatar will fall back to your initials. You can upload a new photo at any time."
            confirmLabel="Remove photo"
            isPending={removeAvatar.isPending}
            onConfirm={() =>
              removeAvatar.mutate(undefined, {
                onSuccess: () => {
                  toast.success("Profile photo removed");
                  setRemoveOpen(false);
                },
                onError: (err) => toast.error("Couldn't remove photo", { description: getApiErrorMessage(err) }),
              })
            }
          />
        </>
      )}
    </>
  );
}
