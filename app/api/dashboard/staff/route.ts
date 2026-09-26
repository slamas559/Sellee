// app/api/dashboard/staff/route.ts
//
// Staff MANAGEMENT is vendor-only - a staff account can never create,
// edit, or remove other staff, regardless of what's checked for them, so
// this route checks session.user.role === "vendor" directly rather than
// going through requireVendorWorkspaceApi (which would also let staff in).

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { withinLimit } from "@/lib/plans";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { listStaffAccounts, STAFF_PERMISSION_KEYS } from "@/lib/staff";

const permissionsSchema = z
  .object(
    Object.fromEntries(STAFF_PERMISSION_KEYS.map((key) => [key, z.boolean().optional()])) as Record<
      (typeof STAFF_PERMISSION_KEYS)[number],
      z.ZodOptional<z.ZodBoolean>
    >
  )
  .partial();

const createStaffSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  permissions: permissionsSchema.default({}),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Shown to the vendor once at creation time; the staff member logs in with
// this and can change it later from their own account settings, same as
// any other password.
function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url"); // 12 chars, url-safe
}

async function requireVendorSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "vendor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

export async function GET() {
  const session = await requireVendorSession();
  if (session instanceof NextResponse) return session;

  try {
    const staff = await listStaffAccounts(session.user.id);
    return NextResponse.json({ staff });
  } catch (error) {
    logDevError("dashboard.staff.list", error, { vendorId: session.user.id });
    return NextResponse.json({ error: "Could not load staff accounts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireVendorSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid name and email." }, { status: 400 });
  }

  const vendorId = session.user.id;
  const email = normalizeEmail(parsed.data.email);
  const supabase = createAdminSupabaseClient();

  // Plan limit check - withinLimit already returns true unconditionally
  // when the admin's monetization toggle is off.
  const existingStaff = await listStaffAccounts(vendorId);
  const allowed = await withinLimit(vendorId, "max_staff", existingStaff.length);
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          existingStaff.length === 0
            ? "Staff accounts aren't included on your current plan. Upgrade to Pro or Business to add staff."
            : "You've reached the staff account limit for your current plan.",
      },
      { status: 403 },
    );
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const { data: created, error: createError } = await supabase
    .from("users")
    .insert({
      full_name: parsed.data.full_name.trim(),
      email,
      password_hash: passwordHash,
      role: "staff",
      parent_vendor_id: vendorId,
    })
    .select("id, full_name, email, created_at")
    .single();

  if (createError || !created) {
    logDevError("dashboard.staff.create", createError, { vendorId, email });
    return NextResponse.json({ error: "Could not create staff account." }, { status: 500 });
  }

  const permissionRows = STAFF_PERMISSION_KEYS.map((key) => ({
    staff_user_id: created.id,
    permission_key: key,
    enabled: parsed.data.permissions[key] === true,
  }));

  const { error: permError } = await supabase.from("staff_permissions").insert(permissionRows);
  if (permError) {
    logDevError("dashboard.staff.create.permissions", permError, { vendorId, staffId: created.id });
    // The account exists but permissions failed to write - roll it back
    // rather than leaving a staff login with no access at all and no clear
    // way for the vendor to fix it from the UI.
    await supabase.from("users").delete().eq("id", created.id);
    return NextResponse.json({ error: "Could not save permissions. Try again." }, { status: 500 });
  }

  return NextResponse.json({
    staff: { ...created, permissions: parsed.data.permissions },
    tempPassword,
  });
}
