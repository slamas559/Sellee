import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell mode="login" title="Choose a new password" subtitle="Enter and confirm your new password below.">
      <Suspense fallback={<p className="text-sm text-slate-300">Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}