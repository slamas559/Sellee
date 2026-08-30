import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findPendingInvite, markInviteAccepted } from "@/lib/admin-invites";
import { writeAuditLog } from "@/lib/audit-log";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const acceptSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
  fullName: z.string().max(120).optional().default(""),
});

// Deliberately not gated by requireAdminApi - this is how someone WITHOUT
// an admin session becomes an admin. proxy.ts allows this exact path
// through for the same reason.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { token, password, fullName } = parsed.data;
  const invite = await findPendingInvite(token);

  if (!invite) {
    return NextResponse.json(
      { error: "This invite link is invalid or has expired." },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();

  const { data: existingUser, error: lookupError } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", invite.email)
    .maybeSingle();

  if (lookupError) {
    logDevError("admin-console.invite.accept.lookup", lookupError, { email: invite.email });
    return NextResponse.json({ error: "Could not process invite." }, { status: 500 });
  }

  if (existingUser && existingUser.role !== "admin") {
    // The users table has a single role per account, so we can't silently
    // turn someone's existing customer/vendor account into an admin one -
    // that would strip their existing role. Ask for a separate email
    // instead of doing something surprising to their account.
    return NextResponse.json(
      {
        error:
          "This email already has a Sellee account that isn't an admin account. Use a different email address to accept this invite.",
      },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let adminId: string;

  if (existingUser) {
    adminId = existingUser.id;
    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: passwordHash, ...(fullName ? { full_name: fullName } : {}) })
      .eq("id", adminId);

    if (updateError) {
      logDevError("admin-console.invite.accept.update", updateError, { email: invite.email });
      return NextResponse.json({ error: "Could not process invite." }, { status: 500 });
    }
  } else {
    const { data: created, error: insertError } = await supabase
      .from("users")
      .insert({
        email: invite.email,
        password_hash: passwordHash,
        full_name: fullName || null,
        role: "admin",
      })
      .select("id")
      .single();

    if (insertError || !created) {
      logDevError("admin-console.invite.accept.insert", insertError, { email: invite.email });
      return NextResponse.json({ error: "Could not process invite." }, { status: 500 });
    }

    adminId = created.id;
  }

  await markInviteAccepted(invite.id);
  await writeAuditLog({
    adminId,
    action: "admin.invite_accepted",
    targetType: "admin_invite",
    targetId: invite.id,
    metadata: { email: invite.email },
  });

  return NextResponse.json({ ok: true });
}
