-- supabase/pending-reviews.sql
create table if not exists public.pending_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_phone text not null,
  step text not null default 'rating' check (step in ('rating', 'comment')),
  rating integer check (rating between 1 and 5),
  prompted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pending_reviews_customer_phone
  on public.pending_reviews (customer_phone)
  where completed_at is null;

create index if not exists idx_pending_reviews_order
  on public.pending_reviews (order_id);

alter table public.pending_reviews enable row level security;
-- Server-side only, no client access needed
create policy "pending_reviews_no_client_access"
on public.pending_reviews for all using (false) with check (false);