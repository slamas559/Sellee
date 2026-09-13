// lib/subscriptions/renewals.ts
//
// There's no saved card / recurring-charge token from the checkout flow we
// built (both providers were integrated as one-off hosted-page redirects,
// not tokenized recurring billing) - so this deliberately does NOT attempt
// to silently re-charge anyone. Silently charging a card we don't actually
// have permission to charge again would be the wrong call even if we could.
//
// Instead: remind before expiry with a renew link, and downgrade to Free
// automatically if the period lapses without a renewal. This is the honest
// MVP shape - upgrading to real recurring billing (Paystack authorization-code
// reuse, Flutterwave tokenized charges) is a distinct, larger feature for
// later if manual renewal turns out to cause too much churn.

import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError, logServerInfo } from "@/lib/logger";
import { sendUpdateEmail } from "@/app/actions/emails";
import { appUrl } from "@/lib/app-url";

const REMINDER_WINDOW_DAYS = 3;

interface SubscriptionRow {
  id: string;
  vendor_id: string;
  current_period_end: string;
  renewal_reminder_sent_at: string | null;
  plans: { key: string; name: string } | { key: string; name: string }[] | null;
  users: { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null;
}

// Supabase's nested-relation typing varies by how the FK is declared, and
// can come back as an object or a single-item array depending on client
// version - normalize once here rather than repeating the check everywhere.
function one<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function sendUpcomingRenewalReminders(limit = 50): Promise<{ sent: number; failed: number }> {
  const supabase = createAdminSupabaseClient();
  const windowEnd = new Date(Date.now() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("vendor_subscriptions")
    .select("id, vendor_id, current_period_end, renewal_reminder_sent_at, plans(key, name), users(email, full_name)")
    .eq("status", "active")
    .lte("current_period_end", windowEnd)
    .gt("current_period_end", new Date().toISOString()) // not yet expired - see expireOverdueSubscriptions for those
    .is("renewal_reminder_sent_at", null)
    .limit(limit);

  if (error) {
    logDevError("subscriptions.renewals.reminders.query", error);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const row of (rows ?? []) as SubscriptionRow[]) {
    const plan = one(row.plans);
    const user = one(row.users);
    if (!plan || plan.key === "free" || !user?.email) continue;

    const result = await sendUpdateEmail({
      to: user.email,
      subject: `Your ${plan.name} plan renews soon`,
      headline: "Your plan renews soon",
      previewText: `Your ${plan.name} plan on Sellee is renewing in the next few days.`,
      intro: `Hi ${user.full_name ?? "there"}, your ${plan.name} plan is set to renew within the next ${REMINDER_WINDOW_DAYS} days. If you'd like to continue on ${plan.name}, renew from your dashboard before it lapses — otherwise you'll move to the Free plan automatically.`,
      blocks: [],
      actionLabel: "Manage your plan",
      actionUrl: appUrl("/dashboard/plans"),
    });

    if (!result.success) {
      failed += 1;
      logDevError("subscriptions.renewals.reminders.send", result.error, { vendorId: row.vendor_id });
      continue;
    }

    const { error: updateError } = await supabase
      .from("vendor_subscriptions")
      .update({ renewal_reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id);

    if (updateError) {
      logDevError("subscriptions.renewals.reminders.mark_sent", updateError, { vendorId: row.vendor_id });
    }

    sent += 1;
  }

  return { sent, failed };
}

export async function expireOverdueSubscriptions(limit = 50): Promise<{ downgraded: number; failed: number }> {
  const supabase = createAdminSupabaseClient();

  const { data: freePlan, error: freePlanError } = await supabase
    .from("plans")
    .select("id")
    .eq("key", "free")
    .single();

  if (freePlanError || !freePlan) {
    logDevError("subscriptions.renewals.expire.free_plan_lookup", freePlanError);
    return { downgraded: 0, failed: 0 };
  }

  const { data: rows, error } = await supabase
    .from("vendor_subscriptions")
    .select("id, vendor_id, plans(key, name), users(email, full_name)")
    .eq("status", "active")
    .lt("current_period_end", new Date().toISOString())
    .neq("plan_id", freePlan.id)
    .limit(limit);

  if (error) {
    logDevError("subscriptions.renewals.expire.query", error);
    return { downgraded: 0, failed: 0 };
  }

  let downgraded = 0;
  let failed = 0;

  for (const row of (rows ?? []) as SubscriptionRow[]) {
    const plan = one(row.plans);
    const user = one(row.users);

    const { error: updateError } = await supabase
      .from("vendor_subscriptions")
      .update({
        plan_id: freePlan.id,
        billing_cycle: null,
        locked_monthly_price: null,
        payment_provider: null,
        provider_subscription_id: null,
        renewal_reminder_sent_at: null,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) {
      failed += 1;
      logDevError("subscriptions.renewals.expire.downgrade", updateError, { vendorId: row.vendor_id });
      continue;
    }

    downgraded += 1;
    logServerInfo("subscriptions.renewals.expired", { vendorId: row.vendor_id, fromPlan: plan?.key });

    if (user?.email) {
      const result = await sendUpdateEmail({
        to: user.email,
        subject: `Your ${plan?.name ?? "plan"} subscription has ended`,
        headline: "You're back on the Free plan",
        previewText: "Your Sellee subscription period ended without a renewal.",
        intro: `Hi ${user.full_name ?? "there"}, your ${plan?.name ?? "paid"} plan subscription period ended and wasn't renewed, so your store has moved to the Free plan. You can upgrade again any time.`,
        blocks: [],
        actionLabel: "Renew your plan",
        actionUrl: appUrl("/dashboard/plans"),
      });
      if (!result.success) {
        logDevError("subscriptions.renewals.expire.notify", result.error, { vendorId: row.vendor_id });
      }
    }
  }

  return { downgraded, failed };
}