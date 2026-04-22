-- Sellee product media + ratings migration for existing projects.
-- Run this once in Supabase SQL editor.

alter table public.stores
  add column if not exists rating_avg numeric(3,2) not null default 0,
  add column if not exists rating_count integer not null default 0;

alter table public.products
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists rating_avg numeric(3,2) not null default 0,
  add column if not exists rating_count integer not null default 0;

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

alter table public.vendor_reviews enable row level security;
alter table public.product_reviews enable row level security;

drop policy if exists "vendor_reviews_public_read" on public.vendor_reviews;
create policy "vendor_reviews_public_read"
on public.vendor_reviews for select
using (true);

drop policy if exists "product_reviews_public_read" on public.product_reviews;
create policy "product_reviews_public_read"
on public.product_reviews for select
using (true);
