import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeEmailVerificationToken } from "@/lib/email-verification";
import { logDevError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const confirmSchema = z.object({
  token: z.string().min(1),
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
    const limit = checkRateLimit(`email-verification-confirm:${ip}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts - please wait a bit and try again." },
        { status: 429 },
      );
    }

    const parsed = confirmSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "This verification link is invalid." }, { status: 400 });
    }

    const consumed = await consumeEmailVerificationToken(parsed.data.token);
    if (!consumed) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired. Please request a new one." },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("users")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", consumed.userId);

    if (error) {
      logDevError("account.email_verification.confirm_failed", error, { userId: consumed.userId });
      return NextResponse.json({ error: "Could not verify your email. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ message: "Your email is verified." });
  } catch (error) {
    logDevError("account.email_verification.confirm_unhandled", error);
    return NextResponse.json({ error: "Could not verify your email. Please try again." }, { status: 500 });
  }
}
