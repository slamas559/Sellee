import { NextResponse } from "next/server";
import { z } from "zod";
import { logDevError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { startRegistrationVerification } from "@/lib/phone-verification";

const registerStartSchema = z.object({
  full_name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(5).max(30),
  role: z.enum(["vendor", "customer"]).optional(),
});

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return realIp ?? "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`register:${ip}`, 8, 15 * 60 * 1000);

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "Too many registration attempts. Please wait a few minutes and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
          },
        },
      );
    }

    const parsed = registerStartSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Please check your details. Name is required, email must be valid, and password at least 8 characters.",
        },
        { status: 400 },
      );
    }

    const challenge = await startRegistrationVerification({
      fullName: parsed.data.full_name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: parsed.data.role ?? "customer",
      phoneInput: parsed.data.phone,
    });

    return NextResponse.json({
      message: "Verification started. Complete WhatsApp verification to activate account.",
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
    const message =
      error instanceof Error ? error.message : "Unexpected server error during registration.";
    const status = message.includes("already exists") ? 409 : 400;

    if (status === 400) {
      logDevError("register.start", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
}

