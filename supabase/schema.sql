-- Sellee initial schema (Phase 1)
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text unique not null,
  phone text,
  password_hash text not null,
  role text not null check (role in ('vendor', 'customer')) default 'customer',
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  logo_url text,
  whatsapp_number text not null,
  address_line1 text,
  city text,
  state text,
  country text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  location_source text check (location_source in ('manual', 'gps')),
  store_template text not null default 'grocery_promo' check (
    store_template in (
      'grocery_promo',
      'fashion_editorial',
      'lifestyle_showcase',
      'modern_grid',
      'classic',
      'bold',
      'minimal'
    )
  ),
  store_theme_preset text not null default 'emerald_fresh' check (
    store_theme_preset in (
      'emerald_fresh',
      'sunlit_market',
      'midnight_luxe',
      'ocean_breeze',
      'rose_boutique'
    )
  ),
  storefront_config jsonb not null default '{}'::jsonb,
  rating_avg numeric(3,2) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  theme_color text default '#0ea5e9',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_stores_lat_lng on public.stores (latitude, longitude);

create table if not exists public.niches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.niche_categories (
  id uuid primary key default gen_random_uuid(),
  niche_id uuid not null references public.niches(id) on delete cascade,
  slug text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (niche_id, slug),
  unique (niche_id, name)
);

create table if not exists public.store_niches (
  store_id uuid not null references public.stores(id) on delete cascade,
  niche_id uuid not null references public.niches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, niche_id)
);

create index if not exists idx_store_niches_store on public.store_niches (store_id);
create index if not exists idx_store_niches_niche on public.store_niches (niche_id);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  description text,
  category text,
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  image_urls text[] not null default '{}',
  rating_avg numeric(3,2) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  stock_count integer not null default 0 check (stock_count >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products (category);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_user_id uuid references public.users(id) on delete set null,
  customer_name text,
  customer_whatsapp text not null,
  status text not null default 'pending_whatsapp',
  total_amount numeric(12, 2) not null default 0,
  payment_method text,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_customer_user_id on public.orders (customer_user_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  method text not null check (method in ('paystack', 'transfer')),
  status text not null default 'pending',
  receipt_url text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  message text not null,
  sent_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_reviews_store_id on public.vendor_reviews (store_id, created_at desc);
create index if not exists idx_product_reviews_product_id on public.product_reviews (product_id, created_at desc);

-- RLS setup
alter table public.users enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.niches enable row level security;
alter table public.niche_categories enable row level security;
alter table public.store_niches enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.broadcasts enable row level security;
alter table public.vendor_reviews enable row level security;
alter table public.product_reviews enable row level security;

-- Basic policies for authenticated reads/writes in Supabase context.
-- These policies are intentionally strict and can be expanded in later phases.
drop policy if exists "users_select_self" on public.users;
create policy "users_select_self"
on public.users for select
using (auth.uid()::text = id::text);

drop policy if exists "stores_vendor_all" on public.stores;
create policy "stores_vendor_all"
on public.stores for all
using (vendor_id::text = auth.uid()::text)
with check (vendor_id::text = auth.uid()::text);

drop policy if exists "niches_public_read" on public.niches;
create policy "niches_public_read"
on public.niches for select
using (true);

drop policy if exists "niche_categories_public_read" on public.niche_categories;
create policy "niche_categories_public_read"
on public.niche_categories for select
using (true);

drop policy if exists "store_niches_vendor_all" on public.store_niches;
create policy "store_niches_vendor_all"
on public.store_niches for all
using (
  exists (
    select 1 from public.stores s
    where s.id = store_niches.store_id
    and s.vendor_id::text = auth.uid()::text
  )
)
with check (
  exists (
    select 1 from public.stores s
    where s.id = store_niches.store_id
    and s.vendor_id::text = auth.uid()::text
  )
);

drop policy if exists "products_vendor_all" on public.products;
create policy "products_vendor_all"
on public.products for all
using (
  exists (
    select 1 from public.stores s
    where s.id = products.store_id
    and s.vendor_id::text = auth.uid()::text
  )
)
with check (
  exists (
    select 1 from public.stores s
    where s.id = products.store_id
    and s.vendor_id::text = auth.uid()::text
  )
);

drop policy if exists "orders_vendor_all" on public.orders;
create policy "orders_vendor_all"
on public.orders for all
using (
  exists (
    select 1 from public.stores s
    where s.id = orders.store_id
    and s.vendor_id::text = auth.uid()::text
  )
)
with check (
  exists (
    select 1 from public.stores s
    where s.id = orders.store_id
    and s.vendor_id::text = auth.uid()::text
  )
);

drop policy if exists "order_items_vendor_all" on public.order_items;
create policy "order_items_vendor_all"
on public.order_items for all
using (
  exists (
    select 1
    from public.orders o
    join public.stores s on s.id = o.store_id
    where o.id = order_items.order_id
    and s.vendor_id::text = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public.orders o
    join public.stores s on s.id = o.store_id
    where o.id = order_items.order_id
    and s.vendor_id::text = auth.uid()::text
  )
);

drop policy if exists "payments_vendor_all" on public.payments;
create policy "payments_vendor_all"
on public.payments for all
using (
  exists (
    select 1
    from public.orders o
    join public.stores s on s.id = o.store_id
    where o.id = payments.order_id
    and s.vendor_id::text = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public.orders o
    join public.stores s on s.id = o.store_id
    where o.id = payments.order_id
    and s.vendor_id::text = auth.uid()::text
  )
);

drop policy if exists "reviews_vendor_all" on public.reviews;
create policy "reviews_vendor_all"
on public.reviews for all
using (
  exists (
    select 1 from public.stores s
    where s.id = reviews.store_id
    and s.vendor_id::text = auth.uid()::text
  )
)
with check (
  exists (
    select 1 from public.stores s
    where s.id = reviews.store_id
    and s.vendor_id::text = auth.uid()::text
  )
);

drop policy if exists "broadcasts_vendor_all" on public.broadcasts;
create policy "broadcasts_vendor_all"
on public.broadcasts for all
using (
  exists (
    select 1 from public.stores s
    where s.id = broadcasts.store_id
    and s.vendor_id::text = auth.uid()::text
  )
)
with check (
  exists (
    select 1 from public.stores s
    where s.id = broadcasts.store_id
    and s.vendor_id::text = auth.uid()::text
  )
);

-- Public browsing policies for customer-facing store pages.
drop policy if exists "stores_public_read_active" on public.stores;
create policy "stores_public_read_active"
on public.stores for select
using (is_active = true);

drop policy if exists "products_public_read_available" on public.products;
create policy "products_public_read_available"
on public.products for select
using (
  is_available = true
  and exists (
    select 1 from public.stores s
    where s.id = products.store_id
    and s.is_active = true
  )
);

drop policy if exists "vendor_reviews_public_read" on public.vendor_reviews;
create policy "vendor_reviews_public_read"
on public.vendor_reviews for select
using (true);

drop policy if exists "product_reviews_public_read" on public.product_reviews;
create policy "product_reviews_public_read"
on public.product_reviews for select
using (true);

insert into public.niches (slug, name)
values
  ('groceries', 'Groceries'),
  ('fashion', 'Fashion'),
  ('electronics', 'Electronics'),
  ('beauty', 'Beauty'),
  ('home-living', 'Home & Living'),
  ('health-fitness', 'Health & Fitness'),
  ('baby-kids', 'Baby & Kids'),
  ('automotive', 'Automotive')
on conflict (slug) do update set name = excluded.name;

insert into public.niche_categories (niche_id, slug, name)
select n.id, v.slug, v.name
from (
  values
    ('groceries', 'fruits-vegetables', 'Fruits & Vegetables'),
    ('groceries', 'grains-rice', 'Grains & Rice'),
    ('groceries', 'beverages', 'Beverages'),
    ('groceries', 'snacks', 'Snacks'),
    ('groceries', 'frozen-foods', 'Frozen Foods'),
    ('fashion', 'mens-wear', 'Men''s Wear'),
    ('fashion', 'womens-wear', 'Women''s Wear'),
    ('fashion', 'shoes', 'Shoes'),
    ('fashion', 'bags', 'Bags'),
    ('fashion', 'accessories', 'Accessories'),
    ('electronics', 'phones-tablets', 'Phones & Tablets'),
    ('electronics', 'computing', 'Computing'),
    ('electronics', 'audio', 'Audio'),
    ('electronics', 'gaming', 'Gaming'),
    ('electronics', 'appliances', 'Appliances'),
    ('beauty', 'skincare', 'Skincare'),
    ('beauty', 'haircare', 'Haircare'),
    ('beauty', 'makeup', 'Makeup'),
    ('beauty', 'fragrance', 'Fragrance'),
    ('home-living', 'furniture', 'Furniture'),
    ('home-living', 'kitchen-dining', 'Kitchen & Dining'),
    ('home-living', 'decor', 'Decor'),
    ('home-living', 'storage-organization', 'Storage & Organization'),
    ('health-fitness', 'supplements', 'Supplements'),
    ('health-fitness', 'fitness-equipment', 'Fitness Equipment'),
    ('health-fitness', 'wellness', 'Wellness'),
    ('baby-kids', 'baby-care', 'Baby Care'),
    ('baby-kids', 'kids-fashion', 'Kids Fashion'),
    ('baby-kids', 'toys-games', 'Toys & Games'),
    ('automotive', 'car-care', 'Car Care'),
    ('automotive', 'accessories', 'Accessories'),
    ('automotive', 'parts-tools', 'Parts & Tools')
) as v(niche_slug, slug, name)
join public.niches n on n.slug = v.niche_slug
on conflict (niche_id, slug) do update set name = excluded.name;
