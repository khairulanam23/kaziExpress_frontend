"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MailCheck, SendHorizonal, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSent(values.email);
  };

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center"
        >
          <span className="bg-success-soft text-success flex size-12 items-center justify-center rounded-full">
            <MailCheck className="size-5" />
          </span>
          <div>
            <p className="font-medium">Check your inbox</p>
            <p className="text-muted-foreground mt-1 text-sm">
              We sent a password reset link to <span className="text-foreground font-medium">{sent}</span>.
            </p>
          </div>
          <a href="/reset-password" className="text-primary text-sm font-medium hover:underline">
            Continue to reset password →
          </a>
          <a href="/login" className="text-muted-foreground flex items-center gap-1 text-xs hover:underline">
            <ArrowLeft className="size-3" /> Back to sign in
          </a>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
            {loading ? "Sending link…" : "Send reset link"}
          </Button>

          <a href="/login" className="text-muted-foreground flex items-center justify-center gap-1 text-xs hover:underline">
            <ArrowLeft className="size-3" /> Back to sign in
          </a>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
