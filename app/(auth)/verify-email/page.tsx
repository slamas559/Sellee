import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailStatus } from "@/components/auth/verify-email-status";

export const metadata: Metadata = {
  title: "Verify Email",
};

export default function VerifyEmailPage() {
  return (
    <AuthShell mode="login" title="Verify your email" subtitle="Confirming your email address.">
      <Suspense fallback={<p className="text-sm text-slate-300">Loading...</p>}>
        <VerifyEmailStatus />
      </Suspense>
    </AuthShell>
  );
}
