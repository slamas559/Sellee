-- Reviews linked to orders.
--
-- Until now a vendor or product review was just a row with a name and a
-- rating, so anyone logged in could review any store any number of times.
-- Each review now points at the order it came from:
--   * one vendor review per order,
--   * one product review per product per order,
--   * only delivered orders can be reviewed (enforced in the API routes),
--   * only order-linked reviews count toward Trusted / Top Seller.
--
-- Run after vendor-verification-tiers.sql.

alter table public.vendor_reviews
  add column if not exists order_id uuid references public.orders(id) on delete set null;

alter table public.product_reviews
  add column if not exists order_id uuid references public.orders(id) on delete set null;

-- ---- Backfill from reviews that came through the WhatsApp flow -----------
-- That flow stored the order on pending_reviews but not on the review. Match
-- a completed pending review to the review written in the same minute for the
-- same store (and product). Only unambiguous one-to-one matches are linked;
-- anything else stays unlinked rather than risk linking the wrong order.

with matches as (
  select
    vr.id as review_id,
    pr.order_id,
    count(*) over (partition by pr.order_id) as reviews_for_order,
    count(*) over (partition by vr.id) as orders_for_review
  from public.pending_reviews pr
  join public.vendor_reviews vr
    on vr.store_id = pr.store_id
   and vr.order_id is null
   and vr.created_at between pr.completed_at - interval '2 minutes'
                         and pr.completed_at + interval '2 minutes'
  where pr.completed_at is not null
)
update public.vendor_reviews v
set order_id = m.order_id
from matches m
where v.id = m.review_id
  and m.reviews_for_order = 1
  and m.orders_for_review = 1;

with matches as (
  select
    rv.id as review_id,
    pr.order_id,
    count(*) over (partition by pr.order_id, pr.product_id) as reviews_for_order,
    count(*) over (partition by rv.id) as orders_for_review
  from public.pending_reviews pr
  join public.product_reviews rv
    on rv.product_id = pr.product_id
   and rv.store_id = pr.store_id
   and rv.order_id is null
   and rv.created_at between pr.completed_at - interval '2 minutes'
                         and pr.completed_at + interval '2 minutes'
  where pr.completed_at is not null
    and pr.product_id is not null
)
update public.product_reviews p
set order_id = m.order_id
from matches m
where p.id = m.review_id
  and m.reviews_for_order = 1
  and m.orders_for_review = 1;

-- ---- One review per order -------------------------------------------------

create unique index if not exists uniq_vendor_reviews_order
  on public.vendor_reviews (order_id)
  where order_id is not null;

create unique index if not exists uniq_product_reviews_order_product
  on public.product_reviews (order_id, product_id)
  where order_id is not null;
