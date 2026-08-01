import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      mode="login"
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to reset your password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}