import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AuthShell
      mode="login"
      title="Welcome back"
      subtitle="Sign in to access your account, orders, and store dashboard."
    >
      <Suspense fallback={<p className="text-sm text-slate-300">Loading login form...</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
