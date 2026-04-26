import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { sendOtpForChallenge } from "@/lib/phone-verification";

const bodySchema = z.object({
  challenge_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid challenge id." }, { status: 400 });
  }

  try {
    await sendOtpForChallenge(parsed.data.challenge_id, session.user.id);
    return NextResponse.json({ message: "OTP sent on WhatsApp." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send OTP." },
      { status: 400 },
    );
  }
}

