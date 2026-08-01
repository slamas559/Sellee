import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPasswordResetEmail } from "@/app/actions/emails";
import { logDevError } from "@/lib/logger";
import { appUrl } from "@/lib/app-url";
import { createPasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return realIp ?? "unknown";
}

// Always the same generic message regardless of whether the email exists -
// this endpoint must never reveal which emails are registered.
const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email, we've sent a password reset link.";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      // Still return the generic message on rate limit, not an error - an
      // attacker probing for valid emails shouldn't be able to distinguish
      // "rate limited" from "not found" from "sent".
      return NextResponse.json({ message: GENERIC_SUCCESS_MESSAGE });
    }

    const parsed = forgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const supabase = createAdminSupabaseClient();

    const { data: user } = await supabase
      .from("users")
      .select("id, email, full_name, password_hash")
      .eq("email", email)
      .maybeSingle();

    // Google-only accounts have no password to reset - silently no-op
    // rather than sending a confusing reset email for a password that
    // doesn't functionally exist. Still returns the same generic message.
    if (user && user.password_hash !== "oauth-google") {
      const rawToken = await createPasswordResetToken(user.id);
      const resetUrl = appUrl(`/reset-password?token=${rawToken}`);

      await sendPasswordResetEmail({
        to: user.email,
        name: user.full_name,
        resetUrl,
      });
    }

    return NextResponse.json({ message: GENERIC_SUCCESS_MESSAGE });
  } catch (error) {
    logDevError("auth.forgot_password.unhandled", error);
    // Even on an unexpected error, don't leak internals - generic message.
    return NextResponse.json({ message: GENERIC_SUCCESS_MESSAGE });
  }
}