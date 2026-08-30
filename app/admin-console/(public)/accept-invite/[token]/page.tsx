import type { Metadata } from "next";
import Link from "next/link";
import { findPendingInvite } from "@/lib/admin-invites";
import { AtlasWordmark } from "@/components/admin-console/atlas-mark";
import { AcceptInviteForm } from "@/components/admin-console/accept-invite-form";

export const metadata: Metadata = { title: "Accept invite" };

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await findPendingInvite(token);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div
          className="flex flex-col items-center gap-1 px-8 py-7 text-center"
          style={{
            background: "var(--atlas-ink)",
            color: "var(--atlas-text-on-ink)",
            borderRadius: "3px 3px 0 0",
          }}
        >
          <AtlasWordmark />
          <p className="mt-1 text-[11.5px]" style={{ color: "var(--atlas-text-on-ink-muted)" }}>
            {invite ? "Set up your admin account" : "Invite link"}
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
          {invite ? (
            <AcceptInviteForm token={token} email={invite.email} />
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-[13px]">
                This invite link is invalid or has expired. Ask whoever invited you to send a new
                one.
              </p>
              <Link href="/admin-console/login" className="atlas-btn" data-variant="outline">
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
