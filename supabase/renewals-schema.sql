-- supabase/renewals-schema.sql
-- Run after checkout-sessions.sql.

alter table public.vendor_subscriptions
  add column if not exists renewal_reminder_sent_at timestamptz;