import bcrypt from "bcryptjs";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { validateWhatsAppNumber } from "@/lib/whatsapp";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";

type ChallengePurpose = "register" | "account_phone_change";
type CompleteVia = "verify_command" | "otp";

type ChallengeRow = {
  id: string;
  purpose: ChallengePurpose;
  user_id: string | null;
  pending_registration_id: string | null;
  target_phone: string;
  verify_code: string;
  otp_code: string;
  status: "pending" | "completed" | "expired" | "cancelled";
  expires_at: string;
};

type PendingRegistrationRow = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: "vendor" | "customer";
  target_phone: string;
  status: "pending" | "completed" | "expired" | "cancelled";
};

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function expiresAtIso(minutes = 10): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function lowerEmail(email: string): string {
  return email.trim().toLowerCase();
}

function makeWaLink(botNumber: string, verifyCode: string): string {
  const command = `VERIFY ${verifyCode}`;
  return `https://wa.me/${botNumber}?text=${encodeURIComponent(command)}`;
}

async function upsertCustomerLink(userId: string, phone: string) {
  const supabase = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("whatsapp_customer_links").upsert(
    {
      customer_phone: phone,
      user_id: userId,
      linked_at: nowIso,
      is_active: true,
    },
    { onConflict: "customer_phone" },
  );
  if (error) {
    throw new Error(error.message);
  }
}

async function ensureVendorPhoneSync(userId: string, phone: string) {
  const supabase = createAdminSupabaseClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  if (user?.role !== "vendor") return;

  await supabase
    .from("stores")
    .update({
      whatsapp_number: phone,
      is_active: true,
    })
    .eq("vendor_id", userId);

  const nowIso = new Date().toISOString();
  await supabase.from("whatsapp_vendor_links").upsert(
    {
      vendor_id: userId,
      whatsapp_number: phone,
      linked_at: nowIso,
      last_verified_at: nowIso,
      is_active: true,
    },
    { onConflict: "vendor_id" },
  );
}

export async function startRegistrationVerification(params: {
  fullName: string;
  email: string;
  password: string;
  role?: "vendor" | "customer";
  phoneInput: string;
}): Promise<{
  challengeId: string;
  verifyCode: string;
  expiresAt: string;
  targetPhone: string;
  command: string;
  waLink: string | null;
}> {
  const phoneCheck = validateWhatsAppNumber(params.phoneInput);
  if (!phoneCheck.ok) {
    throw new Error(phoneCheck.error ?? "Enter a valid WhatsApp number.");
  }

  const email = lowerEmail(params.email);
  const fullName = params.fullName.trim();
  const passwordHash = await bcrypt.hash(params.password, 12);
  const role = params.role ?? "customer";
  const expiresAt = expiresAtIso(10);
  const verifyCode = generateCode();
  const otpCode = generateCode();
  const nowIso = new Date().toISOString();
  const supabase = createAdminSupabaseClient();

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser?.id) {
    throw new Error("An account with this email already exists.");
  }

  const { data: pending, error: pendingError } = await supabase
    .from("pending_registrations")
    .insert({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      role,
      target_phone: phoneCheck.normalized,
      status: "pending",
      expires_at: expiresAt,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (pendingError || !pending?.id) {
    throw new Error(pendingError?.message ?? "Could not start registration verification.");
  }

  const { data: challenge, error: challengeError } = await supabase
    .from("phone_verification_challenges")
    .insert({
      purpose: "register",
      pending_registration_id: pending.id,
      target_phone: phoneCheck.normalized,
      verify_code: verifyCode,
      otp_code: otpCode,
      status: "pending",
      expires_at: expiresAt,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (challengeError || !challenge?.id) {
    throw new Error(challengeError?.message ?? "Could not create verification challenge.");
  }

  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.trim() ?? "";
  return {
    challengeId: String(challenge.id),
    verifyCode,
    expiresAt,
    targetPhone: phoneCheck.normalized,
    command: `VERIFY ${verifyCode}`,
    waLink: botNumber ? makeWaLink(botNumber.replace(/[^0-9]/g, ""), verifyCode) : null,
  };
}

export async function sendOtpForChallenge(challengeId: string, userId?: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("phone_verification_challenges")
    .select("id, purpose, user_id, target_phone, otp_code, verify_code, status, expires_at")
    .eq("id", challengeId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Verification challenge not found.");
  }

  const challenge = data as ChallengeRow;
  if (challenge.status !== "pending") {
    throw new Error("This verification challenge is no longer active.");
  }
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    throw new Error("Verification challenge has expired.");
  }
  if (challenge.purpose === "account_phone_change") {
    if (!userId || challenge.user_id !== userId) {
      throw new Error("Unauthorized challenge access.");
    }
  }

  await sendWhatsAppTextMessage({
    to: challenge.target_phone,
    message: `Your Sellee OTP is ${challenge.otp_code}. It expires in 10 minutes.\n\nYou can also verify by sending: VERIFY ${challenge.verify_code}`,
    command: "PHONE_VERIFY_OTP",
    role: "system",
  });
}

async function markChallengeCompleted(
  challengeId: string,
  via: CompleteVia,
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  await supabase
    .from("phone_verification_challenges")
    .update({
      status: "completed",
      completed_via: via,
      completed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", challengeId);
}

async function finalizePendingRegistration(
  pending: PendingRegistrationRow,
): Promise<{ userId: string; email: string }> {
  const supabase = createAdminSupabaseClient();

  const { data: existing } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", pending.email)
    .maybeSingle();

  let userId = "";
  if (existing?.id) {
    userId = String(existing.id);
  } else {
    const { data: created, error: createError } = await supabase
      .from("users")
      .insert({
        full_name: pending.full_name,
        email: pending.email,
        phone: pending.target_phone,
        role: pending.role,
        password_hash: pending.password_hash,
        phone_verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError || !created?.id) {
      throw new Error(createError?.message ?? "Failed to finalize account.");
    }
    userId = String(created.id);
  }

  const nowIso = new Date().toISOString();
  await supabase
    .from("users")
    .update({
      phone: pending.target_phone,
      phone_verified_at: nowIso,
    })
    .eq("id", userId);

  await upsertCustomerLink(userId, pending.target_phone);
  await ensureVendorPhoneSync(userId, pending.target_phone);

  await supabase
    .from("pending_registrations")
    .update({
      status: "completed",
      completed_user_id: userId,
      updated_at: nowIso,
    })
    .eq("id", pending.id);

  return {
    userId,
    email: pending.email,
  };
}

export async function verifyChallengeByOtp(params: {
  challengeId: string;
  otpCode: string;
  userId?: string;
}): Promise<{
  completed: boolean;
  purpose: ChallengePurpose;
  email?: string;
  userId?: string;
}> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("phone_verification_challenges")
    .select("id, purpose, user_id, pending_registration_id, target_phone, otp_code, status, expires_at")
    .eq("id", params.challengeId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Verification challenge not found.");
  }

  const challenge = data as ChallengeRow;
  if (challenge.status !== "pending") {
    throw new Error("This verification challenge is no longer active.");
  }
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    throw new Error("Verification challenge has expired.");
  }
  if (challenge.otp_code !== params.otpCode.trim()) {
    throw new Error("Invalid OTP code.");
  }

  if (challenge.purpose === "account_phone_change") {
    if (!params.userId || challenge.user_id !== params.userId) {
      throw new Error("Unauthorized challenge.");
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("users")
      .update({
        phone: challenge.target_phone,
        phone_verified_at: nowIso,
      })
      .eq("id", params.userId);

    await upsertCustomerLink(params.userId, challenge.target_phone);
    await ensureVendorPhoneSync(params.userId, challenge.target_phone);
    await markChallengeCompleted(challenge.id, "otp");

    return {
      completed: true,
      purpose: "account_phone_change",
      userId: params.userId,
    };
  }

  if (!challenge.pending_registration_id) {
    throw new Error("Broken registration challenge.");
  }

  const { data: pending, error: pendingError } = await supabase
    .from("pending_registrations")
    .select("id, full_name, email, password_hash, role, target_phone, status")
    .eq("id", challenge.pending_registration_id)
    .maybeSingle();

  if (pendingError || !pending) {
    throw new Error("Pending registration not found.");
  }
  const pendingRow = pending as PendingRegistrationRow;
  if (pendingRow.status !== "pending") {
    throw new Error("Pending registration is no longer active.");
  }

  const finalized = await finalizePendingRegistration(pendingRow);
  await markChallengeCompleted(challenge.id, "otp");

  return {
    completed: true,
    purpose: "register",
    email: finalized.email,
    userId: finalized.userId,
  };
}

export async function verifyByWhatsAppCommand(params: {
  fromPhone: string;
  verifyCode: string;
}): Promise<{
  completed: boolean;
  purpose?: ChallengePurpose;
  message: string;
}> {
  const phoneCheck = validateWhatsAppNumber(params.fromPhone);
  if (!phoneCheck.ok) {
    return { completed: false, message: "Invalid sender number." };
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("phone_verification_challenges")
    .select("id, purpose, user_id, pending_registration_id, target_phone, verify_code, status, expires_at")
    .eq("verify_code", params.verifyCode.trim())
    .eq("target_phone", phoneCheck.normalized)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      completed: false,
      message: "Verification code is invalid or expired.",
    };
  }

  const challenge = data as ChallengeRow;
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    return {
      completed: false,
      message: "Verification code has expired.",
    };
  }

  if (challenge.purpose === "account_phone_change") {
    if (!challenge.user_id) {
      return {
        completed: false,
        message: "Could not resolve account for this verification.",
      };
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("users")
      .update({
        phone: challenge.target_phone,
        phone_verified_at: nowIso,
      })
      .eq("id", challenge.user_id);

    await upsertCustomerLink(challenge.user_id, challenge.target_phone);
    await ensureVendorPhoneSync(challenge.user_id, challenge.target_phone);
    await markChallengeCompleted(challenge.id, "verify_command");

    return {
      completed: true,
      purpose: "account_phone_change",
      message: "Phone number updated and verified successfully.",
    };
  }

  if (!challenge.pending_registration_id) {
    return {
      completed: false,
      message: "Could not resolve registration for this verification.",
    };
  }

  const { data: pending } = await supabase
    .from("pending_registrations")
    .select("id, full_name, email, password_hash, role, target_phone, status")
    .eq("id", challenge.pending_registration_id)
    .maybeSingle();

  if (!pending || (pending as PendingRegistrationRow).status !== "pending") {
    return {
      completed: false,
      message: "Registration is already completed or expired.",
    };
  }

  await finalizePendingRegistration(pending as PendingRegistrationRow);
  await markChallengeCompleted(challenge.id, "verify_command");

  return {
    completed: true,
    purpose: "register",
    message: "Your Sellee account is verified and ready. You can now sign in.",
  };
}

export async function getChallengeStatus(params: {
  challengeId: string;
  userId?: string;
}): Promise<{
  status: "pending" | "completed" | "expired" | "cancelled";
  purpose: ChallengePurpose;
}> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("phone_verification_challenges")
    .select("id, purpose, user_id, status, expires_at")
    .eq("id", params.challengeId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Verification challenge not found.");
  }

  const challenge = data as Pick<ChallengeRow, "purpose" | "user_id" | "status" | "expires_at">;
  if (challenge.purpose === "account_phone_change") {
    if (!params.userId || challenge.user_id !== params.userId) {
      throw new Error("Unauthorized challenge access.");
    }
  }

  if (
    challenge.status === "pending" &&
    new Date(challenge.expires_at).getTime() <= Date.now()
  ) {
    return {
      purpose: challenge.purpose,
      status: "expired",
    };
  }

  return {
    purpose: challenge.purpose,
    status: challenge.status,
  };
}

export async function startAccountPhoneChangeVerification(params: {
  userId: string;
  phoneInput: string;
}): Promise<{
  challengeId: string;
  verifyCode: string;
  expiresAt: string;
  targetPhone: string;
  command: string;
  waLink: string | null;
}> {
  const phoneCheck = validateWhatsAppNumber(params.phoneInput);
  if (!phoneCheck.ok) {
    throw new Error(phoneCheck.error ?? "Enter a valid WhatsApp number.");
  }

  const supabase = createAdminSupabaseClient();
  const { data: me, error: meError } = await supabase
    .from("users")
    .select("phone")
    .eq("id", params.userId)
    .maybeSingle();

  if (meError || !me) {
    throw new Error("Could not load your account.");
  }

  if (String(me.phone ?? "") === phoneCheck.normalized) {
    throw new Error("This phone number is already linked to your account.");
  }

  const verifyCode = generateCode();
  const otpCode = generateCode();
  const expiresAt = expiresAtIso(10);
  const nowIso = new Date().toISOString();

  const { data: challenge, error } = await supabase
    .from("phone_verification_challenges")
    .insert({
      purpose: "account_phone_change",
      user_id: params.userId,
      target_phone: phoneCheck.normalized,
      verify_code: verifyCode,
      otp_code: otpCode,
      status: "pending",
      expires_at: expiresAt,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (error || !challenge?.id) {
    throw new Error(error?.message ?? "Could not create phone-change challenge.");
  }

  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.trim() ?? "";
  return {
    challengeId: String(challenge.id),
    verifyCode,
    expiresAt,
    targetPhone: phoneCheck.normalized,
    command: `VERIFY ${verifyCode}`,
    waLink: botNumber ? makeWaLink(botNumber.replace(/[^0-9]/g, ""), verifyCode) : null,
  };
}
