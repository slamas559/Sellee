import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { adminConsoleUrl } from "@/lib/app-url";
import { createAdminInvite } from "@/lib/admin-invites";
import { sendAdminInviteEmail } from "@/app/actions/emails";
import { writeAuditLog } from "@/lib/audit-log";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const inviteSchema = z.object({
  email: z.string().email(),
});

export async function GET() {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const supabase = createAdminSupabaseClient();

  const [{ data: admins, error: adminsError }, { data: invites, error: invitesError }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, email, full_name, created_at")
        .eq("role", "admin")
        .order("created_at", { ascending: true }),
      supabase
        .from("admin_invites")
        .select("id, email, status, expires_at, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

  if (adminsError || invitesError) {
    logDevError("admin-console.admins.list", adminsError ?? invitesError, {});
    return NextResponse.json({ error: "Could not load admins." }, { status: 500 });
  }

  return NextResponse.json({
    admins: admins ?? [],
    pendingInvites: invites ?? [],
    currentAdminId: session.user.id,
  });
}

export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const supabase = createAdminSupabaseClient();

  const { data: existingAdmin } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .eq("role", "admin")
    .maybeSingle();

  if (existingAdmin) {
    return NextResponse.json({ error: "This person is already an admin." }, { status: 400 });
  }

  let invite;
  try {
    invite = await createAdminInvite(email, session.user.id);
  } catch (error) {
    logDevError("admin-console.admins.invite", error, { email });
    return NextResponse.json({ error: "Could not create invite." }, { status: 500 });
  }

  const acceptUrl = adminConsoleUrl(`/admin-console/accept-invite/${invite.token}`);
  const emailResult = await sendAdminInviteEmail({
    to: email,
    inviterName: session.user.name,
    acceptUrl,
  });

  if (!emailResult.success) {
    logDevError("admin-console.admins.invite-email", emailResult.error, { email });
    return NextResponse.json(
      { error: "Invite was created but the email failed to send. Try again." },
      { status: 500 },
    );
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: "admin.invite_sent",
    targetType: "admin_invite",
    targetId: invite.id,
    metadata: { email },
  });

  return NextResponse.json({ ok: true });
}
