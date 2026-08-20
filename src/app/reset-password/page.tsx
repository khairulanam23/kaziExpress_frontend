import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password — Inventory Management" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Choose a new password"
      title="Reset your password"
      subtitle="Make sure it's at least 8 characters, with a number and an uppercase letter."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
