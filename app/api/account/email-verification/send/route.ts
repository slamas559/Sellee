import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sendEmailVerificationEmail } from "@/app/actions/emails";
import { appUrl } from "@/lib/app-url";
import { authOptions } from "@/lib/auth";
import { createEmailVerificationToken } from "@/lib/email-verification";
import { logDevError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const limit = checkRateLimit(`email-verification-send:${session.user.id}`, 3, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "You've requested this a few times already - please wait a bit and try again." },
        { status: 429 },
      );
    }

    const supabase = createAdminSupabaseClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, full_name, email_verified_at")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: "Could not find your account." }, { status: 404 });
    }

    if (user.email_verified_at) {
      return NextResponse.json({ message: "Your email is already verified." });
    }

    const rawToken = await createEmailVerificationToken(user.id);
    const verifyUrl = appUrl(`/verify-email?token=${rawToken}`);

    const result = await sendEmailVerificationEmail({
      to: user.email,
      name: user.full_name,
      verifyUrl,
    });

    if (!result.success) {
      logDevError("account.email_verification.send_failed", result.error, { userId: user.id });
      return NextResponse.json(
        { error: "Could not send the verification email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: `Verification email sent to ${user.email}.` });
  } catch (error) {
    logDevError("account.email_verification.send_unhandled", error);
    return NextResponse.json(
      { error: "Could not send the verification email. Please try again." },
      { status: 500 },
    );
  }
}
