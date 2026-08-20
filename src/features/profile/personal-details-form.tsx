"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Lock, Save } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUpdateMyProfile } from "@/hooks/queries/use-profile";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api-client";
import { formatDate, toDateInput } from "@/lib/utils";
import type { Profile } from "@/types";

/** A value the organisation owns — shown for reference, never editable here. */
function ReadOnlyField({ label, value, reason }: { label: string; value: string; reason: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="flex items-center gap-1.5">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground cursor-help" aria-label={reason}>
              <Lock className="size-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{reason}</TooltipContent>
        </Tooltip>
      </Label>
      <div className="bg-muted/50 border-border text-muted-foreground flex h-9 items-center rounded-md border px-3 text-sm">
        {value || "—"}
      </div>
    </div>
  );
}

/**
 * Self-service personal details.
 *
 * Only fields the API accepts on `PUT /profile/me` are editable. Email, role,
 * pay rates, department and designation are organisation-controlled and are
 * rendered read-only — the backend rejects them regardless.
 */
export function PersonalDetailsForm({ profile }: { profile: Profile }) {
  const update = useUpdateMyProfile();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const initial = React.useMemo(
    () => ({
      name: profile.name ?? "",
      phone: profile.phone ?? "",
      address: profile.address ?? "",
      dateOfBirth: profile.dateOfBirth ? toDateInput(new Date(profile.dateOfBirth)) : "",
      nidNumber: profile.nidNumber ?? "",
      emergencyContactName: profile.emergencyContactName ?? "",
      emergencyContactPhone: profile.emergencyContactPhone ?? "",
      emergencyContactRelationship: profile.emergencyContactRelationship ?? "",
    }),
    [profile],
  );

  const [form, setForm] = React.useState(initial);

  // Re-seed when a fresh profile arrives (e.g. after a save elsewhere).
  const [seeded, setSeeded] = React.useState(profile.id);
  if (seeded !== profile.id) {
    setSeeded(profile.id);
    setForm(initial);
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const dobInFuture = !!form.dateOfBirth && new Date(form.dateOfBirth) > new Date();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    update.mutate(
      {
        name: form.name.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        nidNumber: form.nidNumber.trim() || null,
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
        emergencyContactRelationship: form.emergencyContactRelationship.trim() || null,
      },
      {
        onSuccess: () => toast.success("Profile updated"),
        onError: (error) => {
          setFieldErrors(getApiFieldErrors(error));
          toast.error("Couldn't update profile", { description: getApiErrorMessage(error) });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <ChartCard
        title="Personal details"
        description="Your own information. Fields marked with a lock are managed by your organisation."
        action={
          <Button type="submit" size="sm" disabled={!dirty || dobInFuture || update.isPending}>
            {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pf-name">Full name</Label>
              <Input id="pf-name" value={form.name} onChange={set("name")} maxLength={120} autoComplete="name" />
              {fieldErrors.name && <p className="text-destructive text-xs">{fieldErrors.name}</p>}
            </div>

            <ReadOnlyField
              label="Employee ID"
              value={profile.id.slice(0, 8).toUpperCase()}
              reason="Derived from your account and cannot be changed"
            />

            <ReadOnlyField label="Email" value={profile.email} reason="Contact an administrator to change your email" />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pf-phone">Phone</Label>
              <Input id="pf-phone" value={form.phone} onChange={set("phone")} maxLength={40} autoComplete="tel" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pf-dob">Date of birth</Label>
              <Input
                id="pf-dob"
                type="date"
                value={form.dateOfBirth}
                max={toDateInput(new Date())}
                onChange={set("dateOfBirth")}
              />
              {dobInFuture && <p className="text-destructive text-xs">Date of birth can&apos;t be in the future.</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pf-nid">NID number</Label>
              <Input id="pf-nid" value={form.nidNumber} onChange={set("nidNumber")} maxLength={60} />
            </div>

            <ReadOnlyField
              label="Designation"
              value={profile.employeeProfile?.designation ?? ""}
              reason="Set by your organisation"
            />
            <ReadOnlyField
              label="Department"
              value={profile.employeeProfile?.department ?? ""}
              reason="Set by your organisation"
            />
            <ReadOnlyField
              label="Joined"
              value={profile.employeeProfile?.joinDate ? formatDate(profile.employeeProfile.joinDate) : ""}
              reason="Set by your organisation"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-address">Address</Label>
            <Textarea id="pf-address" rows={2} value={form.address} onChange={set("address")} maxLength={255} />
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <div>
              <p className="text-sm font-medium">Emergency contact</p>
              <p className="text-muted-foreground text-xs">Who we should reach if something happens at work.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pf-ec-name">Contact name</Label>
                <Input
                  id="pf-ec-name"
                  value={form.emergencyContactName}
                  onChange={set("emergencyContactName")}
                  maxLength={120}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pf-ec-phone">Contact phone</Label>
                <Input
                  id="pf-ec-phone"
                  value={form.emergencyContactPhone}
                  onChange={set("emergencyContactPhone")}
                  maxLength={40}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pf-ec-rel">Relationship</Label>
                <Input
                  id="pf-ec-rel"
                  value={form.emergencyContactRelationship}
                  onChange={set("emergencyContactRelationship")}
                  placeholder="e.g. Spouse, Parent"
                  maxLength={60}
                />
              </div>
            </div>
          </div>
        </div>
      </ChartCard>
    </form>
  );
}
