import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmailVerificationEmail } from "@/lib/emails";
import { appUrl } from "@/lib/app-url";
import { createEmailVerificationToken } from "@/lib/email-verification";
import { logDevError } from "@/lib/logger";
import { checkPhoneAvailability } from "@/lib/phone-verification";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { validateWhatsAppNumber } from "@/lib/whatsapp";

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
    const limit = await checkRateLimit(`register:${ip}`, 8, 15 * 60 * 1000);

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

    const phoneCheck = validateWhatsAppNumber(parsed.data.phone);
    if (!phoneCheck.ok) {
      return NextResponse.json(
        { error: phoneCheck.error ?? "Enter a valid WhatsApp number." },
        { status: 400 },
      );
    }

    const fullName = parsed.data.full_name.trim();
    const email = parsed.data.email.trim().toLowerCase();
    const role = parsed.data.role ?? "customer";
    const supabase = createAdminSupabaseClient();

    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUserError) {
      throw new Error(existingUserError.message);
    }

    if (existingUser?.id) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in or use a different email address." },
        { status: 409 },
      );
    }

    const phoneError = await checkPhoneAvailability(phoneCheck.normalized);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        full_name: fullName,
        email,
        phone: phoneCheck.normalized,
        role,
        password_hash: passwordHash,
      })
      .select("id")
      .single();

    if (insertError || !newUser) {
      if (insertError?.message.toLowerCase().includes("email")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in or use a different email address." },
          { status: 409 },
        );
      }
      throw new Error(insertError?.message ?? "Could not create account.");
    }

    // Best-effort: a failed verification email should never block account
    // creation, which already succeeded above. The account page's
    // EmailVerificationBanner is the safety net for a send that fails here
    // or an email the user simply misses.
    try {
      const rawToken = await createEmailVerificationToken(newUser.id);
      const verifyUrl = appUrl(`/verify-email?token=${rawToken}`);
      const result = await sendEmailVerificationEmail({ to: email, name: fullName, verifyUrl, role });
      if (!result.success) {
        logDevError("register.verification_email_failed", result.error, { userId: newUser.id });
      }
    } catch (verificationError) {
      logDevError("register.verification_email_unhandled", verificationError, { userId: newUser.id });
    }

    return NextResponse.json({
      message: "Account created.",
      email,
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