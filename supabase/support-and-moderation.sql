-- Phase 6: support ticket inbox + product-report moderation queue.

-- Support tickets. The submission flow already exists (Help Center form ->
-- submitHelpCenterTicket -> an email to support@sellee.store) but nothing
-- was ever persisted - every ticket only ever existed as an email, with no
-- way to see ticket history or track status. This adds that.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_ref text not null unique, -- the human-readable ticket ID already generated (e.g. "SLE-XXXXXX")
  requester_email text not null,
  requester_name text,
  issue_type text not null,
  details text not null,
  status text not null check (status in ('open', 'in_progress', 'resolved', 'closed')) default 'open',
  admin_notes text,
  resolved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_support_tickets_status on public.support_tickets (status);
create index if not exists idx_support_tickets_created_at on public.support_tickets (created_at desc);

-- Product reports. There is currently NO way for a customer to report a
-- product at all - this table plus a storefront report button are both
-- new. Reviews aren't included yet; the identical pattern extends to them
-- once this ships.
create table if not exists public.product_reports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  reporter_user_id uuid references public.users(id) on delete set null,
  reporter_email text,
  reason text not null check (reason in ('counterfeit', 'misleading', 'inappropriate', 'other')),
  details text,
  status text not null check (status in ('open', 'dismissed', 'actioned')) default 'open',
  reviewed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_product_reports_status on public.product_reports (status);
create index if not exists idx_product_reports_product on public.product_reports (product_id);