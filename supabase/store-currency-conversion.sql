-- supabase/store-currency-conversion.sql
--
-- Bumpa-style model: a store's `currency` (already added in
-- store-currency.sql) is the AUTHORIZED currency - what's actually charged,
-- what appears in WhatsApp order messages, emails, and admin views. Never
-- converted, never changes based on what a customer was browsing in.
--
-- `activated_currencies` is an opt-in list of additional currencies a
-- vendor lets customers switch the STOREFRONT DISPLAY to, for comparison
-- only. Converting that display uses live-ish rates cached in
-- exchange_rates below.

alter table public.stores add column if not exists activated_currencies text[] not null default '{}';

-- Cheap cache for live FX rates so we don't hit the external provider on
-- every page view. One row per base currency; `rates` maps target currency
-- code -> rate (units of target per 1 unit of base). Refreshed lazily by
-- lib/currency.ts when a cached row is older than the freshness window,
-- not on a fixed cron - simplest thing that works at this stage.
create table if not exists public.exchange_rates (
  base_currency text primary key check (base_currency in ('NGN', 'GHS', 'USD', 'GBP')),
  rates jsonb not null,
  updated_at timestamptz not null default now()
);
