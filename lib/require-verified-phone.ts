import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

type GuardContext = "order" | "vendor_whatsapp";
type RequiredRole = "vendor" | "customer";

type GuardUser = {
  id: string;
  email: string | null;
  phone: string | null;
  role: "vendor" | "customer";
  phone_verified_at: string | null;
};

type GuardFailure = {
  ok: false;
  response: NextResponse;
};

type GuardSuccess = {
  ok: true;
  user: GuardUser;
};

export type RequireVerifiedPhoneResult = GuardFailure | GuardSuccess;

function contextMessage(context: GuardContext) {
  if (context === "vendor_whatsapp") {
    return {
      noPhone: "Add your WhatsApp number in Account settings before using vendor WhatsApp features.",
      unverified:
        "Verify your WhatsApp number in Account settings before using vendor WhatsApp features.",
    };
  }

  return {
    noPhone: "Add your WhatsApp number in Account settings before placing orders.",
    unverified: "Verify your WhatsApp number in Account settings before placing orders.",
  };
}

export async function requireVerifiedPhone(params: {
  userId: string | null | undefined;
  context: GuardContext;
  requiredRole?: RequiredRole;
}): Promise<RequireVerifiedPhoneResult> {
  const { userId, context, requiredRole } = params;

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, phone, role, phone_verified_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Could not verify your account." }, { status: 500 }),
    };
  }

  const user = data as GuardUser;
  if (requiredRole && user.role !== requiredRole) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const messages = contextMessage(context);
  if (!String(user.phone ?? "").trim()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: messages.noPhone,
          requires_phone_verification: true,
          action: "verify_phone",
        },
        { status: 400 },
      ),
    };
  }

  if (!user.phone_verified_at) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: messages.unverified,
          requires_phone_verification: true,
          action: "verify_phone",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}
