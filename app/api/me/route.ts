import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";

function deriveDisplayName(fullName: string | null, email: string): string {
  if (fullName?.trim()) {
    return fullName.trim();
  }
  const local = (email.split("@")[0] ?? "customer").replace(/[._-]+/g, " ").trim();
  if (!local) return "Customer";
  return local
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("id, full_name, email, phone, role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ error: "Could not load user profile." }, { status: 500 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      display_name: deriveDisplayName(user.full_name, user.email),
    },
  });
}

const updateMeSchema = z.object({
  full_name: z.string().min(2).max(80),
  phone: z.string().min(10).max(20).optional().or(z.literal("")),
});

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = updateMeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Full name must be 2-80 characters." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const fullName = parsed.data.full_name.trim();
  const rawPhone = parsed.data.phone;
  let normalizedPhone: string | null | undefined;

  if (typeof rawPhone === "string") {
    if (!rawPhone.trim()) {
      normalizedPhone = null;
    } else {
      normalizedPhone = normalizeWhatsAppNumber(rawPhone);
      if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 20) {
        return NextResponse.json({ error: "Phone number must be 10-20 digits." }, { status: 400 });
      }
    }
  }

  const { data: user, error } = await supabase
    .from("users")
    .update({
      full_name: fullName,
      ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
    })
    .eq("id", session.user.id)
    .select("id, full_name, email, phone, role")
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "Could not update user profile." }, { status: 500 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      display_name: deriveDisplayName(user.full_name, user.email),
    },
    message: "Profile updated.",
  });
}
