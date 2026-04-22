-- Sellee marketplace migration.
-- Run this once in Supabase SQL editor for existing projects.

alter table public.products
  add column if not exists category text;

create index if not exists idx_products_category on public.products (category);
