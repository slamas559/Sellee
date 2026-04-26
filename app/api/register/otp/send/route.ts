import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOtpForChallenge } from "@/lib/phone-verification";

const bodySchema = z.object({
  challenge_id: z.string().uuid(),
});

export async function POST(request: Request) {
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

