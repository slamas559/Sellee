import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import type { StoreForCommand } from "@/lib/whatsapp-bot/types";

export async function resolveVendorStoreByPhone(from: string): Promise<StoreForCommand | null> {
  const supabase = createAdminSupabaseClient();
  const normalizedFrom = normalizeWhatsAppNumber(from);

  let vendorId: string | null = null;

  const { data: linkedVendor } = await supabase
    .from("whatsapp_vendor_links")
    .select("vendor_id")
    .eq("whatsapp_number", normalizedFrom)
    .eq("is_active", true)
    .maybeSingle();

  if (linkedVendor?.vendor_id) {
    vendorId = String(linkedVendor.vendor_id);
  }

  if (!vendorId) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, phone, role")
      .eq("role", "vendor")
      .not("phone", "is", null);

    if (usersError) {
      throw new Error(usersError.message);
    }

    const vendorUser = (users ?? []).find((user) => {
      const normalizedPhone = normalizeWhatsAppNumber(String(user.phone ?? ""));
      return normalizedPhone === normalizedFrom;
    });

    if (vendorUser?.id) {
      vendorId = String(vendorUser.id);
    }
  }

  if (!vendorId) {
    return null;
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, vendor_id")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (storeError || !store) {
    return null;
  }

  return {
    id: String(store.id),
    name: String(store.name),
    vendor_id: String(store.vendor_id),
  };
}

export async function findOrderByReference(storeId: string, rawRef: string) {
  const supabase = createAdminSupabaseClient();
  const ref = rawRef.toLowerCase();
  const isFullUuid = ref.includes("-") && ref.length >= 30;

  if (isFullUuid) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, customer_whatsapp, customer_name, total_amount")
      .eq("store_id", storeId)
      .eq("id", ref)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, status, customer_whatsapp, customer_name, total_amount")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).find((order) => String(order.id).toLowerCase().startsWith(ref)) ?? null;
}
