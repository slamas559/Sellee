-- supabase/payment-provider-scaffolding.sql
-- Run after pricing-plans.sql. Adds raw webhook event logging so both
-- providers can be wired in later without another schema change, and so
-- webhook deliveries are idempotent (providers retry on any non-2xx).

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,               -- 'paystack' | 'flutterwave'
  provider_event_id text not null,      -- event/transaction id from the provider payload
  event_type text not null,             -- e.g. 'charge.success', 'subscription.create'
  vendor_id uuid references public.users(id) on delete set null,
  payload jsonb not null,
  processed boolean not null default false,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)  -- lets webhook handlers upsert-and-skip on retry
);

create index if not exists payment_events_vendor_id_idx on public.payment_events(vendor_id);