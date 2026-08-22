import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { SignupForm } from "@/features/auth/signup-form";

export const metadata: Metadata = { title: "Register — Kazi Express" };

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Get started"
      title="Create workspace account"
      subtitle="Register a new administrator account to manage your workspace."
    >
      <SignupForm />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{" "}
        <a href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </a>
      </p>
    </AuthShell>
  );
}
