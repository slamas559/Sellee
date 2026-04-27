import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <AuthShell
      mode="register"
      title="Create account"
      subtitle="Join as a customer. You can become a vendor from your account anytime."
    >
      <RegisterForm />
    </AuthShell>
  );
}
