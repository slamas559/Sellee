-- Phase 4 of the vendor verification redesign: tiers.
--
-- 1. Orders get a buyer-confirmation timestamp. An order only counts toward
--    Trusted / Top Seller when the BUYER confirmed it: they either left a
--    review or replied RECEIVED on WhatsApp. A vendor marking an order
--    "delivered" is not enough on its own.
-- 2. stores.is_verified stops being the generated "WhatsApp + email" column
--    and becomes a normal boolean that the app keeps in sync with the new
--    verification_tier (none | verified | trusted | top_seller).
--
-- IMPORTANT: after running this, every store starts as unverified until the
-- tier recompute runs. Run it right away by calling the cron endpoint once
-- (GET /api/vendor-tiers/run with your bearer secret).
--
-- Run this in the Supabase SQL editor (after vendor-verifications.sql).

-- ---- Buyer confirmation on orders ----------------------------------------

alter table public.orders add column if not exists buyer_confirmed_at timestamptz;
alter table public.orders add column if not exists buyer_confirmed_via text;

alter table public.orders drop constraint if exists orders_buyer_confirmed_via_check;
alter table public.orders add constraint orders_buyer_confirmed_via_check
  check (buyer_confirmed_via is null or buyer_confirmed_via in ('received_reply', 'review'));

create index if not exists idx_orders_store_buyer_confirmed
  on public.orders (store_id)
  where buyer_confirmed_at is not null;

-- Orders whose review was already completed count as buyer-confirmed.
update public.orders o
set buyer_confirmed_at = pr.completed_at,
    buyer_confirmed_via = 'review'
from public.pending_reviews pr
where pr.order_id = o.id
  and pr.completed_at is not null
  and o.buyer_confirmed_at is null;

-- ---- Store badge columns --------------------------------------------------

-- is_verified used to be a generated column (WhatsApp AND email verified).
-- If another object depends on it this statement fails loudly instead of
-- silently breaking it - fix the dependency and re-run.
alter table public.stores drop column if exists is_verified;

alter table public.stores add column if not exists is_verified boolean not null default false;

alter table public.stores add column if not exists verification_tier text not null default 'none';
alter table public.stores drop constraint if exists stores_verification_tier_check;
alter table public.stores add constraint stores_verification_tier_check
  check (verification_tier in ('none', 'verified', 'trusted', 'top_seller'));

alter table public.stores add column if not exists verification_tier_updated_at timestamptz;

-- A performance tier is only dropped after two failing daily runs in a row,
-- so one bad day doesn't flip a vendor's badge back and forth.
alter table public.stores add column if not exists tier_demotion_strikes smallint not null default 0;

-- Manual admin suspension: while set, the store has no badge at all.
alter table public.stores add column if not exists verification_suspended_at timestamptz;
alter table public.stores add column if not exists verification_suspended_reason text;

create index if not exists idx_stores_verification_tier
  on public.stores (verification_tier)
  where verification_tier <> 'none';
