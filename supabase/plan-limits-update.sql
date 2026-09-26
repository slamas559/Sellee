-- supabase/plan-limits-update.sql
-- Run after 2026xxxx_create_pricing_plans.sql. Updates staff and broadcast
-- limits across all three plans to the final locked numbers:
--   Free = 0 staff / 0 broadcasts
--   Pro = 1 staff / 1 broadcast
--   Business = 3 staff / 3 broadcasts
-- The original seed had Free at max_staff=1, which was a mistake — Free
-- isn't supposed to have staff accounts at all — plus Pro at 2 staff/500
-- broadcasts and Business at 5 staff/unlimited broadcasts. Uses UPDATE
-- rather than the original migration's "insert ... on conflict do nothing"
-- because these rows already exist for anyone who ran that migration — an
-- ON CONFLICT DO NOTHING insert would silently skip changing them.
--
-- Everything else (max_products, plan_features) is untouched.

update public.plan_limits pl
set limit_value = 0
from public.plans p
where pl.plan_id = p.id
  and p.key = 'free'
  and pl.limit_key = 'max_staff';

update public.plan_limits pl
set limit_value = 1
from public.plans p
where pl.plan_id = p.id
  and p.key = 'pro'
  and pl.limit_key = 'max_staff';

update public.plan_limits pl
set limit_value = 1
from public.plans p
where pl.plan_id = p.id
  and p.key = 'pro'
  and pl.limit_key = 'broadcast_per_month';

update public.plan_limits pl
set limit_value = 3
from public.plans p
where pl.plan_id = p.id
  and p.key = 'business'
  and pl.limit_key = 'max_staff';

update public.plan_limits pl
set limit_value = 3
from public.plans p
where pl.plan_id = p.id
  and p.key = 'business'
  and pl.limit_key = 'broadcast_per_month';

-- Safety net: if a fresh environment runs this before ever running the
-- original seed migration's plan_limits inserts for some reason, make sure
-- the rows exist with the correct final values instead of silently no-op'ing.
insert into public.plan_limits (plan_id, limit_key, limit_value)
select id, 'max_staff', 0 from public.plans where key = 'free'
union all select id, 'max_staff', 1 from public.plans where key = 'pro'
union all select id, 'broadcast_per_month', 1 from public.plans where key = 'pro'
union all select id, 'max_staff', 3 from public.plans where key = 'business'
union all select id, 'broadcast_per_month', 3 from public.plans where key = 'business'
on conflict (plan_id, limit_key) do nothing;
