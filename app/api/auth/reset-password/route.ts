import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logDevError } from "@/lib/logger";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return realIp ?? "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts - please wait a bit and try again." },
        { status: 429 },
      );
    }

    const parsed = resetPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const consumed = await consumePasswordResetToken(parsed.data.token);
    if (!consumed) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("id", consumed.userId);

    if (error) {
      logDevError("auth.reset_password.update_failed", error, { userId: consumed.userId });
      return NextResponse.json({ error: "Could not reset password. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ message: "Password updated. You can now sign in with your new password." });
  } catch (error) {
    logDevError("auth.reset_password.unhandled", error);
    return NextResponse.json({ error: "Could not reset password. Please try again." }, { status: 500 });
  }
}