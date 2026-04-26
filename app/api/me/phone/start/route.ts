import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { startAccountPhoneChangeVerification } from "@/lib/phone-verification";

const bodySchema = z.object({
  phone: z.string().min(5).max(30),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid phone payload." }, { status: 400 });
  }

  try {
    const challenge = await startAccountPhoneChangeVerification({
      userId: session.user.id,
      phoneInput: parsed.data.phone,
    });

    return NextResponse.json({
      message: "Phone verification started.",
      challenge: {
        id: challenge.challengeId,
        expires_at: challenge.expiresAt,
        target_phone: challenge.targetPhone,
        command: challenge.command,
        verify_code: challenge.verifyCode,
        wa_link: challenge.waLink,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start phone verification." },
      { status: 400 },
    );
  }
}

