// lib/broadcasts/email-audience.ts
//
// Email counterpart to resolveBroadcastTargets() in
// lib/whatsapp-bot/broadcasts.ts. Deliberately separate rather than a shared
// function with a channel switch: the two queries pull from different
// columns entirely (phone-keyed follows/orders vs email-keyed users), and
// forcing them into one function would just mean branching on channel
// inside a single function body — no real logic is shared.
//
// Audience = verified registered users only. An unverified email is not
// just lower-quality, it's the thing this whole feature depends on getting
// right — sending broadcast/marketing content to an address nobody
// confirmed owning is how you get flagged as a spam source.

import { createAdminSupabaseClient } from "@/lib/supabase-admin";

type TargetScope = "followers" | "customers" | "all";

export interface EmailBroadcastRecipient {
  userId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
}

export async function resolveEmailBroadcastTargets(
  storeId: string,
  targetScope: TargetScope,
): Promise<EmailBroadcastRecipient[]> {
  const supabase = createAdminSupabaseClient();
  const recipients = new Map<string, EmailBroadcastRecipient>();

  // "customers" path: orders.customer_user_id is set whenever the buyer has
  // a registered account (web checkout, or a bot order once they're
  // signed in) - this is a direct FK to users, no join needed.
  if (targetScope === "customers" || targetScope === "all") {
    const { data, error } = await supabase
      .from("orders")
      .select("users(id, email, full_name, phone, email_verified_at)")
      .eq("store_id", storeId)
      .not("customer_user_id", "is", null)
      .limit(1000);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as Array<{
      users: { id: string; email: string; full_name: string | null; phone: string | null; email_verified_at: string | null } | { id: string; email: string; full_name: string | null; phone: string | null; email_verified_at: string | null }[] | null;
    }>) {
      const user = Array.isArray(row.users) ? row.users[0] : row.users;
      if (user?.email && user.email_verified_at) {
        recipients.set(user.id, { userId: user.id, email: user.email, fullName: user.full_name, phone: user.phone });
      }
    }
  }

  // "followers" path: customer_store_follows is phone-keyed (it's populated
  // by the WhatsApp bot, which only ever sees a phone number), so recovering
  // an email means joining through users.phone. Confirmed elsewhere that
  // both the bot and registration normalize phone numbers identically
  // (digits-only via normalizeWhatsAppNumber), so this join is safe.
  if (targetScope === "followers" || targetScope === "all") {
    const { data: follows, error: followsError } = await supabase
      .from("customer_store_follows")
      .select("customer_phone")
      .eq("store_id", storeId);

    if (followsError) {
      throw new Error(followsError.message);
    }

    const phones = Array.from(
      new Set(
        (follows ?? [])
          .map((row) => String((row as { customer_phone?: string | null }).customer_phone ?? "").trim())
          .filter(Boolean),
      ),
    );

    if (phones.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, email, full_name, phone, email_verified_at")
        .in("phone", phones)
        .not("email_verified_at", "is", null);

      if (usersError) {
        throw new Error(usersError.message);
      }

      for (const user of (users ?? []) as Array<{
        id: string;
        email: string;
        full_name: string | null;
        phone: string | null;
        email_verified_at: string | null;
      }>) {
        recipients.set(user.id, { userId: user.id, email: user.email, fullName: user.full_name, phone: user.phone });
      }
    }
  }

  return Array.from(recipients.values()).slice(0, 1000);
}