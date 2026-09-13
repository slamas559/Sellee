-- supabase/checkout-sessions.sql
-- Run after pricing-lock-update.sql.
--
-- Tracks a checkout attempt from the moment we ask Paystack/Flutterwave for
-- a payment link until it's confirmed, independent of the webhook arriving.
-- Both the webhook AND the redirect-back callback page look a payment up by
-- tx_ref here rather than trusting query params or webhook metadata alone -
-- defense in depth, since either channel can be spoofed or delayed on its own.

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  tx_ref text unique not null,
  vendor_id uuid not null references public.users(id) on delete cascade,
  plan_key text not null references public.plans(key),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  provider text not null check (provider in ('paystack', 'flutterwave')),
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists checkout_sessions_vendor_id_idx on public.checkout_sessions(vendor_id);

-- vendor_subscriptions needs to know the billing cycle to compute the next
-- current_period_end correctly (monthly vs yearly), and provider_customer
-- email for receipts/lookups.
alter table public.vendor_subscriptions
  add column if not exists billing_cycle text check (billing_cycle in ('monthly', 'yearly'));