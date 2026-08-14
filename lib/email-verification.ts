import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

/**
 * Email verification tokens: the raw token is only ever shown to the user
 * once, inside the verification-link email. We store only its SHA-256 hash
 * in the DB, so a database read alone can never be used to verify someone
 * else's email - the attacker would still need the raw token from the
 * actual email. Mirrors lib/password-reset.ts.
 *
 * Tokens expire after 24 hours (longer than a password reset, since this
 * isn't a security-sensitive action - just proving inbox access) and are
 * single-use. Requesting a new email invalidates previous unused tokens.
 */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const supabase = createAdminSupabaseClient();

  // Invalidate any previous unused tokens for this user first, so only the
  // most recently requested verification link can ever work.
  await supabase
    .from("email_verification_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("used_at", null);

  const rawToken = generateRawToken();
  const { error } = await supabase.from("email_verification_tokens").insert({
    user_id: userId,
    token_hash: hashToken(rawToken),
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return rawToken;
}

export async function consumeEmailVerificationToken(
  rawToken: string,
): Promise<{ userId: string } | null> {
  const supabase = createAdminSupabaseClient();
  const tokenHash = hashToken(rawToken);

  const { data: tokenRow, error } = await supabase
    .from("email_verification_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !tokenRow) return null;
  if (tokenRow.used_at) return null;
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) return null;

  const { error: updateError } = await supabase
    .from("email_verification_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  if (updateError) return null;

  return { userId: tokenRow.user_id };
}
