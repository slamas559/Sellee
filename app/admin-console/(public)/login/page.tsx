import type { Metadata } from "next";
import { AtlasWordmark } from "@/components/admin-console/atlas-mark";
import { AdminLoginForm } from "@/components/admin-console/admin-login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div
          className="flex flex-col items-center gap-1 px-8 py-7 text-center"
          style={{
            background: "var(--atlas-ink)",
            color: "var(--atlas-text-on-ink)",
            borderRadius: "3px 3px 0 0",
          }}
        >
          <AtlasWordmark />
          <p
            className="mt-1 text-[11.5px]"
            style={{ color: "var(--atlas-text-on-ink-muted)" }}
          >
            Sellee platform administration
          </p>
        </div>

        <div
          className="px-8 py-7"
          style={{
            background: "var(--atlas-paper-raised)",
            border: "1px solid var(--atlas-line)",
            borderTop: "none",
            borderRadius: "0 0 3px 3px",
          }}
        >
          <AdminLoginForm />
        </div>

        <p
          className="mt-4 text-center text-[11px]"
          style={{ color: "var(--atlas-text-muted)" }}
        >
          Access is by invitation only.
        </p>
      </div>
    </div>
  );
}
