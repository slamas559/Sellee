-- supabase/pricing-lock-update.sql
-- Run after pricing-plans.sql. Sets final locked-in prices and adds the
-- column needed to implement the "keep your signup price until renewal"
-- policy, instead of a price change silently applying mid-cycle.

-- Final pricing (yearly = 10x monthly, i.e. ~2 months free)
update public.plans set price_monthly = 3000,  price_yearly = 30000 where key = 'pro';
update public.plans set price_monthly = 6500,  price_yearly = 65000 where key = 'business';

-- Tracks what a vendor is actually paying right now, separate from the
-- plan's current list price. When you raise plans.price_monthly later,
-- existing vendor_subscriptions rows are untouched — they keep paying
-- locked_monthly_price until their current_period_end, at which point the
-- renewal charge (once checkout/webhooks are wired up) should re-read the
-- plan's current price and update this column. This is what makes "keep
-- your signup price until it expires, then move to new price" work without
-- any special-casing — it falls out of "always charge locked_monthly_price
-- for renewals, and only update it after a successful new charge."
alter table public.vendor_subscriptions
  add column if not exists locked_monthly_price numeric(10,2);

-- Backfill: anyone already on a paid plan locks in at that plan's current price.
update public.vendor_subscriptions vs
set locked_monthly_price = p.price_monthly
from public.plans p
where vs.plan_id = p.id
and vs.locked_monthly_price is null;