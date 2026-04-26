import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyChallengeByOtp } from "@/lib/phone-verification";

const bodySchema = z.object({
  challenge_id: z.string().uuid(),
  otp: z.string().trim().min(4).max(10),
});

export async function POST(request: Request) {
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

