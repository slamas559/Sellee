"use client";

import { signOut } from "next-auth/react";

type SignOutButtonProps = {
  callbackUrl?: string;
  className?: string;
  label?: string;
};

export function SignOutButton({
  callbackUrl = "/login",
  className,
  label = "Sign out",
}: SignOutButtonProps = {}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className={className ?? "rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"}
    >
      {label}
    </button>
  );
}
