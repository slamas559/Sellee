import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sign in to manage your store dashboard.
        </p>

        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-slate-500">Loading login form...</p>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-sm text-slate-600">
          New here?{" "}
          <Link href="/register" className="font-medium text-sky-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
