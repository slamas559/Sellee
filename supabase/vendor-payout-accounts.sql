-- Phase 1 of the vendor verification redesign: payout accounts.
--
-- A store has at most one payout (settlement) bank account. The account
-- name is resolved server-side through Paystack (never trusted from the
-- client) and later compared against the name on the vendor's ID during
-- admin review (Phase 3). The account number is stored in plain text by
-- design - access is limited to the service-role client used by the API
-- routes and the admin console.
--
-- Run this in the Supabase SQL editor.

create table if not exists public.vendor_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  vendor_id uuid not null references public.users(id) on delete cascade,
  bank_code text not null,
  bank_name text not null,
  account_number text not null check (account_number ~ '^[0-9]{10}$'),
  -- Name returned by the bank via Paystack's resolve endpoint.
  resolved_account_name text not null,
  -- 'pending' until an admin compares this name with the vendor's ID
  -- (Phase 3). 'matched' / 'mismatch' are set by that review.
  name_match_status text not null default 'pending'
    check (name_match_status in ('pending', 'matched', 'mismatch')),
  resolved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_payout_accounts_vendor
  on public.vendor_payout_accounts (vendor_id);

-- Lets admins spot the same bank account attached to several stores.
-- Deliberately NOT unique: a vendor can legitimately own more than one
-- store, but the overlap is a useful fraud signal during review.
create index if not exists idx_vendor_payout_accounts_account
  on public.vendor_payout_accounts (bank_code, account_number);

-- Only the service-role client (API routes, admin console) touches this
-- table. RLS on with no policies means anon/authenticated keys get nothing.
alter table public.vendor_payout_accounts enable row level security;
