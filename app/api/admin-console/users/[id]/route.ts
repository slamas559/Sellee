import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { deleteFromStorageBucket } from "@/lib/storage-cleanup";

const statusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});

async function loadTarget(id: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, role, status")
    .eq("id", id)
    .maybeSingle();
  return { data, error };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data: target, error: lookupError } = await loadTarget(id);
  if (lookupError) {
    logDevError("admin-console.users.patch.lookup", lookupError, { id });
    return NextResponse.json({ error: "Could not load account." }, { status: 500 });
  }
  if (!target || target.role === "admin") {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const supabase = createAdminSupabaseClient();
  const { error: updateError } = await supabase
    .from("users")
    .update({ status: parsed.data.status })
    .eq("id", id);

  if (updateError) {
    logDevError("admin-console.users.patch", updateError, { id });
    return NextResponse.json({ error: "Could not update account." }, { status: 500 });
  }

  // A suspended vendor's store disappears from search/storefront/sitemap/
  // WhatsApp bot immediately (all of that already keys off is_active);
  // reactivating restores it. Suspending a customer only blocks their own
  // login/checkout - there's no storefront to hide.
  if (target.role === "vendor") {
    await supabase
      .from("stores")
      .update({ is_active: parsed.data.status === "active" })
      .eq("vendor_id", id);
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: parsed.data.status === "suspended" ? "user.suspended" : "user.reactivated",
    targetType: "user",
    targetId: id,
    metadata: { email: target.email, role: target.role },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const { data: target, error: lookupError } = await loadTarget(id);

  if (lookupError) {
    logDevError("admin-console.users.delete.lookup", lookupError, { id });
    return NextResponse.json({ error: "Could not load account." }, { status: 500 });
  }
  if (!target || target.role === "admin") {
    // Admin accounts are removed via the dedicated revoke endpoint, not
    // this one - keeps the two action types (and their audit entries)
    // clearly separate.
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const supabase = createAdminSupabaseClient();

  // Deleting the vendor's own products/store rows is handled by the
  // existing DB-level cascades (users -> stores -> products -> orders),
  // but Supabase Storage isn't part of that cascade - collect every image
  // URL first so we can clean the actual files up after the row is gone.
  let productImageUrls: string[] = [];
  let storeLogoUrls: string[] = [];
  let deletedStoreCount = 0;
  let deletedProductCount = 0;

  if (target.role === "vendor") {
    const { data: stores } = await supabase
      .from("stores")
      .select("id, logo_url")
      .eq("vendor_id", id);

    const storeIds = (stores ?? []).map((s) => s.id);
    deletedStoreCount = storeIds.length;
    storeLogoUrls = (stores ?? []).map((s) => s.logo_url).filter((url): url is string => !!url);

    if (storeIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("image_url, image_urls")
        .in("store_id", storeIds);

      deletedProductCount = products?.length ?? 0;
      productImageUrls = (products ?? []).flatMap((p) => [
        ...(Array.isArray(p.image_urls) ? p.image_urls : []),
        ...(p.image_url ? [p.image_url] : []),
      ]);
    }
  }

  const { error: deleteError } = await supabase.from("users").delete().eq("id", id);

  if (deleteError) {
    logDevError("admin-console.users.delete", deleteError, { id });
    return NextResponse.json({ error: "Could not delete account." }, { status: 500 });
  }

  await Promise.all([
    deleteFromStorageBucket("product-images", productImageUrls),
    deleteFromStorageBucket("store-assets", storeLogoUrls),
  ]);

  await writeAuditLog({
    adminId: session.user.id,
    action: "user.deleted",
    targetType: "user",
    targetId: id,
    metadata: {
      email: target.email,
      role: target.role,
      storesDeleted: deletedStoreCount,
      productsDeleted: deletedProductCount,
    },
  });

  return NextResponse.json({ ok: true });
}
