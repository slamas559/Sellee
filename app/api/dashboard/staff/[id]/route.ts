// app/api/dashboard/staff/[id]/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { STAFF_PERMISSION_KEYS } from "@/lib/staff";

const permissionsSchema = z
  .object(
    Object.fromEntries(STAFF_PERMISSION_KEYS.map((key) => [key, z.boolean().optional()])) as Record<
      (typeof STAFF_PERMISSION_KEYS)[number],
      z.ZodOptional<z.ZodBoolean>
    >
  )
  .partial();

const updateStaffSchema = z.object({
  full_name: z.string().trim().min(1).max(120).optional(),
  permissions: permissionsSchema.optional(),
});

async function requireVendorSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "vendor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

// Confirms the staff row exists AND belongs to this vendor before any
// mutation - without this a vendor could edit/delete any staff id by guessing.
async function loadOwnedStaffRow(vendorId: string, staffId: string) {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("id", staffId)
    .eq("parent_vendor_id", vendorId)
    .eq("role", "staff")
    .maybeSingle();
  return data;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireVendorSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const owned = await loadOwnedStaffRow(session.user.id, id);
  if (!owned) {
    return NextResponse.json({ error: "Staff account not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  if (parsed.data.full_name) {
    const { error } = await supabase
      .from("users")
      .update({ full_name: parsed.data.full_name.trim() })
      .eq("id", id);

    if (error) {
      logDevError("dashboard.staff.update.name", error, { staffId: id });
      return NextResponse.json({ error: "Could not update name." }, { status: 500 });
    }
  }

  if (parsed.data.permissions) {
    const updates = Object.entries(parsed.data.permissions).filter(([, v]) => typeof v === "boolean");
    for (const [permission_key, enabled] of updates) {
      const { error } = await supabase
        .from("staff_permissions")
        .upsert(
          { staff_user_id: id, permission_key, enabled },
          { onConflict: "staff_user_id,permission_key" },
        );

      if (error) {
        logDevError("dashboard.staff.update.permissions", error, { staffId: id, permission_key });
        return NextResponse.json({ error: "Could not update permissions." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireVendorSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const owned = await loadOwnedStaffRow(session.user.id, id);
  if (!owned) {
    return NextResponse.json({ error: "Staff account not found." }, { status: 404 });
  }

  const supabase = createAdminSupabaseClient();
  // staff_permissions rows cascade-delete via the FK; deleted_users logging
  // happens automatically via the existing trigger on public.users.
  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) {
    logDevError("dashboard.staff.delete", error, { staffId: id });
    return NextResponse.json({ error: "Could not remove staff account." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
