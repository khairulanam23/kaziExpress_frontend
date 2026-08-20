"use client";

import * as React from "react";
import { toast } from "sonner";
import { Building2, Camera, Loader2, Save } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization, useUpdateOrganization, useUploadOrganizationLogo } from "@/hooks/queries/use-profile";
import { getApiErrorMessage } from "@/lib/api-client";
import { ACCEPTED_IMAGE_MIME, MAX_IMAGE_BYTES } from "@/services/profile.service";
import { cn } from "@/lib/utils";
import type { OrganizationProfile } from "@/types";
import { formatFileSize } from "./document-helpers";

const FIELDS: { key: keyof OrganizationProfile; label: string; placeholder?: string; type?: string }[] = [
  { key: "name", label: "Organisation name", placeholder: "Nimbus Industries Ltd." },
  { key: "legalName", label: "Registered legal name", placeholder: "Nimbus Industries Limited" },
  { key: "registrationNumber", label: "Registration number", placeholder: "C-118842/2019" },
  { key: "taxId", label: "Tax / BIN", placeholder: "BIN-004417723" },
  { key: "email", label: "Contact email", placeholder: "accounts@example.com", type: "email" },
  { key: "phone", label: "Contact phone", placeholder: "+880 2 9876543" },
  { key: "website", label: "Website", placeholder: "example.com" },
  { key: "addressLine", label: "Address", placeholder: "Plot 42, Tejgaon Industrial Area" },
  { key: "city", label: "City", placeholder: "Dhaka" },
  { key: "country", label: "Country", placeholder: "Bangladesh" },
];

/**
 * Business identity for administrators.
 *
 * These details are also the letterhead on every generated PDF, so the card
 * says so — editing here visibly changes payroll statements and reports.
 */
export function OrganizationSection() {
  const { data: org, isLoading, isError, error, refetch } = useOrganization();
  const update = useUpdateOrganization();
  const uploadLogo = useUploadOrganizationLogo();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [form, setForm] = React.useState<Partial<OrganizationProfile>>({});
  const [seeded, setSeeded] = React.useState<string | null>(null);

  if (org && seeded !== org.id) {
    setSeeded(org.id);
    setForm(Object.fromEntries(FIELDS.map((f) => [f.key, (org[f.key] as string) ?? ""])));
  }

  const dirty = React.useMemo(() => {
    if (!org) return false;
    return FIELDS.some((f) => ((form[f.key] as string) ?? "") !== ((org[f.key] as string) ?? ""));
  }, [form, org]);

  const nameEmpty = !((form.name as string) ?? "").trim();

  const handleLogo = (file: File | null) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_MIME.includes(file.type as (typeof ACCEPTED_IMAGE_MIME)[number])) {
      toast.error("Unsupported image", { description: "Choose a JPG, PNG or WebP file." });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large", { description: `That image is ${formatFileSize(file.size)}. The maximum is 5 MB.` });
      return;
    }
    uploadLogo.mutate(
      { file },
      {
        onSuccess: () => toast.success("Organisation logo updated"),
        onError: (err) => toast.error("Couldn't upload logo", { description: getApiErrorMessage(err) }),
      },
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.fromEntries(
      FIELDS.map((f) => [f.key, ((form[f.key] as string) ?? "").trim() || null]),
    ) as Partial<OrganizationProfile>;

    update.mutate(payload, {
      onSuccess: () => toast.success("Organisation details saved"),
      onError: (err) => toast.error("Couldn't save organisation", { description: getApiErrorMessage(err) }),
    });
  };

  if (isError) {
    return (
      <ChartCard title="Organisation" description="Business identity and registration details.">
        <ErrorState error={error} onRetry={() => refetch()} />
      </ChartCard>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <ChartCard
        title="Organisation"
        description="Business identity and registration details. These appear on the letterhead of every generated PDF."
        action={
          <Button type="submit" size="sm" disabled={!dirty || nameEmpty || update.isPending}>
            {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </Button>
        }
      >
        {isLoading && !org ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Logo */}
            <div className="bg-muted/40 flex items-center gap-4 rounded-xl p-4">
              <div className="relative">
                {org?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- logo is served from the API host
                  <img
                    src={org.logoUrl}
                    alt={`${org.name} logo`}
                    className="bg-card size-20 rounded-xl object-contain p-1.5 shadow-sm"
                  />
                ) : (
                  <span className="bg-primary-soft text-primary flex size-20 items-center justify-center rounded-xl">
                    <Building2 className="size-8" />
                  </span>
                )}
                {uploadLogo.isPending && (
                  <span className="bg-foreground/40 absolute inset-0 flex items-center justify-center rounded-xl">
                    <Loader2 className="text-background size-5 animate-spin" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{org?.name ?? "Your organisation"}</p>
                <p className="text-muted-foreground text-xs">
                  The logo is reserved for the PDF letterhead. JPG, PNG or WebP up to 5 MB.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploadLogo.isPending}
              >
                <Camera className="size-4" />
                {org?.logoUrl ? "Replace" : "Upload"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="sr-only"
                onChange={(e) => handleLogo(e.target.files?.[0] ?? null)}
                aria-label="Upload organisation logo"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <Label htmlFor={`org-${f.key}`}>
                    {f.label}
                    {f.key === "name" && " *"}
                  </Label>
                  <Input
                    id={`org-${f.key}`}
                    type={f.type ?? "text"}
                    value={(form[f.key] as string) ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className={cn(f.key === "name" && nameEmpty && "border-destructive")}
                  />
                </div>
              ))}
            </div>

            {nameEmpty && <p className="text-destructive text-xs">An organisation name is required.</p>}
          </div>
        )}
      </ChartCard>
    </form>
  );
}
