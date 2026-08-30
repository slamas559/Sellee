"use client";

import { signOut } from "next-auth/react";

export function AtlasTopbar({
  adminName,
  adminEmail,
}: {
  adminName?: string | null;
  adminEmail?: string | null;
}) {
  return (
    <header
      className="flex items-center justify-end px-6 py-3"
      style={{ borderBottom: "1px solid var(--atlas-line)" }}
    >
      <div className="flex items-center gap-4">
        <div className="text-right leading-tight">
          <p className="text-[12.5px] font-medium">{adminName || adminEmail}</p>
          {adminName ? (
            <p className="atlas-figure text-[10.5px]" style={{ color: "var(--atlas-text-muted)" }}>
              {adminEmail}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="atlas-btn"
          data-variant="outline"
          onClick={() => signOut({ callbackUrl: "/admin-console/login" })}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
