import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const updateSchema = z.object({
  is_active: z.boolean(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid store." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, vendor_id, is_active")
    .eq("id", id)
    .maybeSingle();

  if (storeError) {
    logDevError("admin-console.stores.update.lookup", storeError, { id });
    return NextResponse.json({ error: "Could not load store." }, { status: 500 });
  }
  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  if (parsed.data.is_active) {
    const { data: vendor, error: vendorError } = await supabase
      .from("users")
      .select("status")
      .eq("id", store.vendor_id)
      .maybeSingle();
    if (vendorError) {
      logDevError("admin-console.stores.update.vendor", vendorError, { id, vendorId: store.vendor_id });
      return NextResponse.json({ error: "Could not verify the store owner's status." }, { status: 500 });
    }
    if (!vendor || vendor.status === "suspended") {
      return NextResponse.json(
        { error: "Reactivate the store owner's account before making this store visible." },
        { status: 409 },
      );
    }
  }

  const { error: updateError } = await supabase
    .from("stores")
    .update({ is_active: parsed.data.is_active })
    .eq("id", id);

  if (updateError) {
    logDevError("admin-console.stores.update", updateError, { id, is_active: parsed.data.is_active });
    return NextResponse.json({ error: "Could not update store visibility." }, { status: 500 });
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: parsed.data.is_active ? "store.activated" : "store.deactivated",
    targetType: "store",
    targetId: id,
    metadata: { name: store.name, vendorId: store.vendor_id, is_active: parsed.data.is_active },
  });

  return NextResponse.json({ ok: true });
}
