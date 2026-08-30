import { createHash, randomBytes } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError } from "@/lib/logger";

const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreatedInvite {
  id: string;
  email: string;
  token: string; // raw token - only ever returned once, at creation time
  expiresAt: string;
}

export async function createAdminInvite(email: string, invitedBy: string): Promise<CreatedInvite> {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from("admin_invites")
    .insert({
      email: normalizedEmail,
      token_hash: hashToken(token),
      invited_by: invitedBy,
      expires_at: expiresAt,
    })
    .select("id, email, expires_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create invite.");
  }

  return { id: data.id, email: data.email, token, expiresAt: data.expires_at };
}

export interface PendingInvite {
  id: string;
  email: string;
  invitedBy: string;
}

/**
 * Looks up a pending, unexpired invite by its raw token without consuming
 * it - used to render the accept-invite page (show the email it was sent
 * to, confirm it hasn't expired) before the person sets a password.
 */
export async function findPendingInvite(token: string): Promise<PendingInvite | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("admin_invites")
    .select("id, email, invited_by, status, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error) {
    logDevError("admin-invites.find", error);
    return null;
  }

  if (!data || data.status !== "pending" || new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }

  return { id: data.id, email: data.email, invitedBy: data.invited_by };
}

export async function markInviteAccepted(inviteId: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  await supabase
    .from("admin_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", inviteId);
}
