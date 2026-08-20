"use client";

import * as React from "react";
import { SectionHeader } from "@/components/shared/chart-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChangePassword, getApiErrorMessage } from "@/hooks/queries/use-auth";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { SystemConfigCard } from "@/features/settings/system-config-card";
import { useAuthStore } from "@/store/auth-store";

export default function SettingsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const changePassword = useChangePassword();
  const [form, setForm] = React.useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    changePassword.mutate(
      { currentPassword: form.currentPassword, newPassword: form.newPassword },
      {
        onSuccess: () => {
          toast.success("Password changed successfully");
          setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        },
        onError: (error) => toast.error("Couldn't change password", { description: getApiErrorMessage(error) }),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Settings"
        description={isAdmin ? "Manage your account security and system-wide defaults." : "Manage your account security."}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>You&apos;ll need your current password to set a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Current password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={form.currentPassword}
                  onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground cursor-pointer"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>New password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground cursor-pointer"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Confirm new password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground cursor-pointer"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending && <Loader2 className="size-4 animate-spin" />}
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Config endpoints are admin-scoped server-side; the card is hidden for employees. */}
      {isAdmin && <SystemConfigCard />}
    </div>
  );
}
