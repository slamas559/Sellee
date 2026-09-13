-- migration: 2026xxxx_create_pricing_plans.sql
-- Vendor identity = public.users(id) where role = 'vendor' (confirmed against
-- your actual schema.sql — there is no separate "vendors" table).

-- 1. Plans table
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,               -- 'free' | 'pro' | 'business'
  name text not null,
  price_monthly numeric(10,2) not null default 0,
  price_yearly numeric(10,2) not null default 0,
  is_purchasable boolean not null default false,  -- flip true when ready to sell this plan
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Numeric/boolean limits per plan
create table if not exists public.plan_limits (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  limit_key text not null,      -- 'max_products' | 'max_staff' | 'broadcast_per_month'
  limit_value int,              -- null = unlimited
  unique (plan_id, limit_key)
);

-- 3. Boolean feature flags per plan
create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_key text not null,    -- 'advanced_analytics' | 'promo_pricing' | 'exportable_reports' | etc.
  enabled boolean not null default true,
  unique (plan_id, feature_key)
);

-- 4. Vendor subscription state
-- vendor_id references public.users(id) directly, matching the pattern used
-- by stores.vendor_id, whatsapp_links.vendor_id, etc. elsewhere in your schema.
create table if not exists public.vendor_subscriptions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null unique references public.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active',   -- active | trialing | canceled | past_due
  payment_provider text,                    -- 'paystack' | 'flutterwave' | null
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Global monetization switch (single-row config table)
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null
);
insert into public.app_config (key, value)
values ('monetization_enabled', 'false')
on conflict (key) do nothing;

-- Note: no RLS policies here. Sellee's auth is NextAuth (Credentials + Google),
-- not Supabase Auth, so auth.uid() has no meaning against your session — all
-- reads/writes to these tables go through createAdminSupabaseClient() (service
-- role) on the server, same as vendor-insights.ts, dashboard-data.ts, etc.
-- If you later add any client-side Supabase calls against these tables using
-- the anon key, that's the point to add real RLS scoped to your own session
-- model (e.g. a server-set claim), not auth.uid().

-- ============ SEED DATA ============

insert into public.plans (key, name, price_monthly, price_yearly, is_purchasable, sort_order) values
  ('free', 'Free', 0, 0, true, 0),
  ('pro', 'Pro', 4900, 49000, false, 1),      -- adjust pricing
  ('business', 'Business', 14900, 149000, false, 2)
on conflict (key) do nothing;

-- Limits
insert into public.plan_limits (plan_id, limit_key, limit_value)
select id, 'max_products', 20 from public.plans where key = 'free'
union all select id, 'max_staff', 1 from public.plans where key = 'free'
union all select id, 'broadcast_per_month', 0 from public.plans where key = 'free'
union all select id, 'max_products', 200 from public.plans where key = 'pro'
union all select id, 'max_staff', 2 from public.plans where key = 'pro'
union all select id, 'broadcast_per_month', 500 from public.plans where key = 'pro'
union all select id, 'max_products', null from public.plans where key = 'business'
union all select id, 'max_staff', 5 from public.plans where key = 'business'
union all select id, 'broadcast_per_month', null from public.plans where key = 'business'
on conflict (plan_id, limit_key) do nothing;

-- Features
insert into public.plan_features (plan_id, feature_key, enabled)
select id, 'advanced_analytics', false from public.plans where key = 'free'
union all select id, 'exportable_reports', false from public.plans where key = 'free'
union all select id, 'promo_pricing', false from public.plans where key = 'free'
union all select id, 'priority_search_placement', false from public.plans where key = 'free'
union all select id, 'featured_homepage_boost', false from public.plans where key = 'free'
union all select id, 'advanced_analytics', true from public.plans where key = 'pro'
union all select id, 'exportable_reports', false from public.plans where key = 'pro'
union all select id, 'promo_pricing', true from public.plans where key = 'pro'
union all select id, 'priority_search_placement', true from public.plans where key = 'pro'
union all select id, 'featured_homepage_boost', false from public.plans where key = 'pro'
union all select id, 'advanced_analytics', true from public.plans where key = 'business'
union all select id, 'exportable_reports', true from public.plans where key = 'business'
union all select id, 'promo_pricing', true from public.plans where key = 'business'
union all select id, 'priority_search_placement', true from public.plans where key = 'business'
union all select id, 'featured_homepage_boost', true from public.plans where key = 'business'
on conflict (plan_id, feature_key) do nothing;

-- Backfill every existing vendor onto the Free plan
insert into public.vendor_subscriptions (vendor_id, plan_id, status)
select u.id, (select id from public.plans where key = 'free'), 'active'
from public.users u
where u.role = 'vendor'
and not exists (
  select 1 from public.vendor_subscriptions vs where vs.vendor_id = u.id
);