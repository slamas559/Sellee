"use client";

import { signOut } from "next-auth/react";
import type { LucideIcon } from "lucide-react";

type SignOutButtonProps = {
  callbackUrl?: string;
  className?: string;
  icon?: LucideIcon;
  label?: string;
};

export function SignOutButton({
  callbackUrl = "/login",
  className,
  icon: Icon,
  label = "Sign out",
}: SignOutButtonProps = {}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className={className ?? "rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
