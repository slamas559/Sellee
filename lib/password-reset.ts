import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

/**
 * Password reset tokens: the raw token is only ever shown to the user once,
 * inside the reset-link email. We store only its SHA-256 hash in the DB, so
 * a database read alone can never be used to reset someone's password -
 * the attacker would still need the raw token from the actual email.
 *
 * Tokens expire after 1 hour and are single-use (marked used_at on
 * successful reset). A user requesting a new reset invalidates their
 * previous unused tokens.
 */

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const supabase = createAdminSupabaseClient();

  // Invalidate any previous unused tokens for this user first, so only the
  // most recently requested reset link can ever work.
  await supabase
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("used_at", null);

  const rawToken = generateRawToken();
  const { error } = await supabase.from("password_reset_tokens").insert({
    user_id: userId,
    token_hash: hashToken(rawToken),
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return rawToken;
}

export async function consumePasswordResetToken(rawToken: string): Promise<{ userId: string } | null> {
  const supabase = createAdminSupabaseClient();
  const tokenHash = hashToken(rawToken);

  const { data: tokenRow, error } = await supabase
    .from("password_reset_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !tokenRow) return null;
  if (tokenRow.used_at) return null;
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) return null;

  const { error: updateError } = await supabase
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  if (updateError) return null;

  return { userId: tokenRow.user_id };
}