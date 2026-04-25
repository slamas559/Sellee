-- Sellee customer orders ownership migration.
-- Run this once in Supabase SQL editor.

alter table public.orders
  add column if not exists customer_user_id uuid references public.users(id) on delete set null;

create index if not exists idx_orders_customer_user_id
  on public.orders (customer_user_id, created_at desc);

