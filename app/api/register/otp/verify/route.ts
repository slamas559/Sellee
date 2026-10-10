import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/request-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyChallengeByOtp } from "@/lib/phone-verification";

const bodySchema = z.object({
  challenge_id: z.string().uuid(),
  otp: z.string().trim().min(4).max(10),
});

export async function POST(request: Request) {
  const limit = await checkRateLimit(`register-otp-verify:${getClientIp(request)}`, 30, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid OTP payload." }, { status: 400 });
  }

  try {
    const result = await verifyChallengeByOtp({
      challengeId: parsed.data.challenge_id,
      otpCode: parsed.data.otp,
    });

    return NextResponse.json({
      message: "Phone verified successfully.",
      completed: result.completed,
      email: result.email ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "OTP verification failed.",
      },
      { status: 400 },
    );
  }
}

