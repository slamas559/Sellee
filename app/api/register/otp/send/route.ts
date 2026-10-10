import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/request-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendOtpForChallenge } from "@/lib/phone-verification";

const bodySchema = z.object({
  challenge_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const limit = await checkRateLimit(`register-otp-send:${getClientIp(request)}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid challenge id." }, { status: 400 });
  }

  try {
    await sendOtpForChallenge(parsed.data.challenge_id);
    return NextResponse.json({ message: "OTP sent on WhatsApp." });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not send OTP on WhatsApp. Try Verify on WhatsApp instead.",
      },
      { status: 400 },
    );
  }
}

